import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordRangeError } from '@seedcord/errors/internal';

import { computeLayoutHash, decodeBody, encodeBody, HASH_LENGTH } from './codec';
import { InvalidCustomId, StaleCustomId } from './Errors';

import type { CustomIdField, CustomIdShape, DecodedParams } from './Field';
import type { Snowflake } from 'discord.js';
import type { NonEmptyTuple } from 'type-fest';

// discord caps a customId at 100 chars.
const MAX_WIRE_LENGTH = 100;

function routeKeyOf(wire: string): string {
    const colon = wire.indexOf(':');
    return colon < 0 ? '' : wire.slice(0, colon);
}

/** Strip the layout hash off the routeKey to recover the stable prefix the controller routes by. @internal */
export function prefixOf(wire: string): string {
    const key = routeKeyOf(wire);
    return key.length <= HASH_LENGTH ? '' : key.slice(0, key.length - HASH_LENGTH);
}

/**
 * A typed customId. The single source of truth shared by the component that mints it and the handler
 * that reads it. This gives you typed reads on the `.customId` field in components. Values are packed into a compact wire string rather than plain stringified tokens, so the 100-char Discord limit goes further. More string per string, basically.
 *
 * @typeParam Prefix - The stable route prefix, e.g. 'approve'.
 * @typeParam Shape - The accumulated fields, filled in by the chain.
 *
 * @example
 * ```ts
 * const ApproveId = new CustomId('approve')
 *     .snowflake('userId')
 *     .oneOf('action', ['approve', 'deny']);
 *
 * // Set the custom id on a button when creating it.
 * new ButtonBuilder().setCustomId(ApproveId.encode({ userId: '123', action: 'approve' }));
 *
 * // reading in the handler: userId comes back a string
 * const { userId, action } = this.params; // userId: string, action: 'approve' | 'deny'
 * await this.event.guild?.members.fetch(userId);
 * ```
 */
export class CustomId<Prefix extends string, Shape extends CustomIdShape = {}> {
    readonly prefix: Prefix;
    readonly shape: Shape;
    /** The prefix plus a short hash of the shape, the part of the wire before the colon. */
    readonly routeKey: string;

    constructor(prefix: Prefix, shape: Shape = {} as Shape) {
        // an empty prefix would make the routeKey all-hash so prefixOf strips it to nothing and the
        // controller cannot route it, and a colon or control char would break the wire framing.
        if (!prefix || /[:\x1b\x1f]/.test(prefix)) {
            throw new SeedcordError(SeedcordErrorCode.CustomIdInvalidPrefix, [prefix]);
        }
        this.prefix = prefix;
        this.shape = shape;
        this.routeKey = prefix + computeLayoutHash(shape);
    }

    // a fresh immutable CustomId with one more field so we don't need a `as unknown as this` cast.
    private add<Name extends string, Decoded>(
        name: Name,
        field: CustomIdField<Decoded>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Decoded>>> {
        // integer-like keys get reordered by js, which would scramble the field order.
        if (/^(?:0|[1-9]\d*)$/.test(name)) throw new SeedcordError(SeedcordErrorCode.CustomIdReservedFieldName, [name]);
        // a repeat name collapses the field's decoded type to never and overwrites the earlier field
        // at runtime, so reject it here at define time.
        if (name in this.shape) throw new SeedcordError(SeedcordErrorCode.CustomIdDuplicateFieldName, [name]);
        // justified, the spread plus a computed key cannot be proven to the exact intersection
        const shape = { ...this.shape, [name]: field } as Shape & Record<Name, CustomIdField<Decoded>>;
        return new CustomId(this.prefix, shape);
    }

    /**
     * Add a Discord ID field, decoded as a string (the discord.js `Snowflake` type).
     *
     * @example
     * ```ts
     * new CustomId('ban').snowflake('userId');
     * ```
     */
    snowflake<Name extends string>(name: Name): CustomId<Prefix, Shape & Record<Name, CustomIdField<Snowflake>>> {
        return this.add<Name, Snowflake>(name, { kind: 'snowflake' });
    }

    /**
     * Add a UUID field, decoded as a lowercase uuid string.
     *
     * @example
     * ```ts
     * new CustomId('ticket').uuid('ticketId');
     * ```
     */
    uuid<Name extends string>(name: Name): CustomId<Prefix, Shape & Record<Name, CustomIdField<string>>> {
        return this.add<Name, string>(name, { kind: 'uuid' });
    }

    /**
     * Add an integer field. Pass min and max to pack it tightly, or omit both for an unbounded value up to 2^53.
     *
     * @example
     * ```ts
     * new CustomId('paginate').int('page', 1, 50); // bounded
     * new CustomId('shop').int('amount'); // unbounded
     * ```
     */
    int<Name extends string>(name: Name): CustomId<Prefix, Shape & Record<Name, CustomIdField<number>>>;
    int<Name extends string>(
        name: Name,
        min: number,
        max: number
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<number>>>;
    int<Name extends string>(
        name: Name,
        min?: number,
        max?: number
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<number>>> {
        if (min !== undefined && max !== undefined && min > max) {
            throw new SeedcordError(SeedcordErrorCode.CustomIdInvalidBounds, [name, min, max]);
        }
        const field: CustomIdField<number> =
            min === undefined || max === undefined ? { kind: 'int' } : { kind: 'int', min, max };
        return this.add<Name, number>(name, field);
    }

    /**
     * Add a boolean flag.
     *
     * @example
     * ```ts
     * new CustomId('settings').bool('silent');
     * ```
     */
    bool<Name extends string>(name: Name): CustomId<Prefix, Shape & Record<Name, CustomIdField<boolean>>> {
        return this.add<Name, boolean>(name, { kind: 'bool' });
    }

    /**
     * Add a field that is one value from a fixed list, decoded as the literal union. No `as const` needed.
     *
     * @example
     * ```ts
     * new CustomId('poll').oneOf('choice', ['yes', 'no', 'abstain']);
     * ```
     */
    oneOf<Name extends string, const Choices extends NonEmptyTuple<string>>(
        name: Name,
        choices: Choices
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Choices[number]>>> {
        if (choices.length === 0) throw new SeedcordError(SeedcordErrorCode.CustomIdEmptyChoices, [name]);
        return this.add<Name, Choices[number]>(name, { kind: 'oneOf', choices });
    }

    /**
     * Add a free short text field. Avoid it where possible, it cannot be packed so it costs the most wire space.
     *
     * @example
     * ```ts
     * new CustomId('note').str('message');
     * ```
     */
    str<Name extends string>(name: Name): CustomId<Prefix, Shape & Record<Name, CustomIdField<string>>> {
        return this.add<Name, string>(name, { kind: 'string' });
    }

    /**
     * Mint a wire string from values. Throws if a value is out of its field's range or the wire is over 100 chars.
     *
     * @param values - One value per field, typed by the chain.
     * @returns The wire string to put on the component's customId.
     */
    encode(values: DecodedParams<Shape>): string {
        const wire = `${this.routeKey}:${encodeBody(this.shape, values)}`;
        if (wire.length > MAX_WIRE_LENGTH) {
            throw new SeedcordRangeError(SeedcordErrorCode.CustomIdWireTooLong, [wire.length]);
        }
        return wire;
    }

    /**
     * Read a wire string back into values. Throws StaleCustomId when the shape changed since the wire was
     * minted, or InvalidCustomId on a corrupt wire.
     *
     * @param wire - The customId string from the interaction.
     * @returns The decoded values, typed by the chain.
     */
    decode(wire: string): DecodedParams<Shape> {
        const key = routeKeyOf(wire);
        if (key !== this.routeKey) {
            // same prefix but a different hash means the shape changed since this wire was minted.
            if (prefixOf(wire) === this.prefix) throw new StaleCustomId(this.prefix);
            throw new InvalidCustomId(`routeKey ${JSON.stringify(key)} is not ${JSON.stringify(this.routeKey)}`);
        }
        // justified, the codec returns runtime values and the shape guarantees their decoded types.
        return decodeBody(this.shape, wire.slice(key.length + 1)) as DecodedParams<Shape>;
    }

    /** True if this wire was minted from this customId's prefix, ignoring the shape hash. */
    owns(wire: string): boolean {
        return prefixOf(wire) === this.prefix;
    }
}

/**
 * Any customId, for places where the exact prefix and shape do not matter.
 *
 * @internal
 */
export type AnyCustomId = CustomId<string, CustomIdShape>;

/**
 * The outcome of decoding a wire against several customIds, the matched prefix paired with its values.
 *
 * @internal
 */
export type DecodedRoute<Defs extends readonly AnyCustomId[]> = {
    [Index in keyof Defs]: Defs[Index] extends AnyCustomId
        ? { readonly prefix: Defs[Index]['prefix']; readonly params: DecodedParams<Defs[Index]['shape']> }
        : never;
}[number];

/**
 * Find the customId whose prefix owns this wire, decode against it, and report which one matched.
 *
 * @internal
 */
export function decodeFor<Defs extends readonly AnyCustomId[]>(defs: Defs, wire: string): DecodedRoute<Defs> {
    const match = defs.find((def) => def.owns(wire));
    if (!match) throw new InvalidCustomId(`no customId owns ${JSON.stringify(routeKeyOf(wire))}`);
    // justified, the matched customId fixes both prefix and params together but find() loses that link.
    return { prefix: match.prefix, params: match.decode(wire) } as DecodedRoute<Defs>;
}
