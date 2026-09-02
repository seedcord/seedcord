import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';

import { computeLayoutHash, decodeBody, encodeBody, HASH_LENGTH } from './codec';
import { invalidError, staleError } from './errors';

import type { CustomIdField, CustomIdShape, DecodedParams } from './Field';
import type { Snowflake } from 'discord-api-types/v10';
import type { NonEmptyTuple } from 'type-fest';

// discord caps a customId at 100 chars.
const MAX_WIRE_LENGTH = 100;

/** Per-field options every {@link CustomId} chain method takes. */
export interface FieldOptions<Nullable extends boolean = boolean> {
    /**
     * Whether the field also carries null. A nullable field costs one extra slot on the wire.
     *
     * @defaultValue `false`
     */
    nullable?: Nullable;
}

type Nullish<Decoded, Nullable extends boolean> = Nullable extends true ? Decoded | null : Decoded;

function routeKeyOf(wire: string): string {
    const colon = wire.indexOf(':');
    return colon === -1 ? '' : wire.slice(0, colon);
}

/**
 * Recover the stable prefix from a wire by stripping its layout hash.
 *
 * Route on this. The prefix survives a shape change. A click on a component built before the change
 * still reaches the same place, where {@link CustomId.decode} refuses it. Returns an empty string for a
 * wire too short to carry a hash.
 *
 * @param wire - The customId string from the interaction.
 * @returns The prefix the customId was declared with.
 *
 * @example
 * ```ts
 * const Approve = new CustomId('approve').snowflake('userId');
 *
 * // 'approve', whatever fields the definition carries today
 * prefixOf(Approve.encode({ userId: '123' }));
 *
 * // route a raw interaction on it
 * const handler = handlers.get(prefixOf(interaction.customId));
 * ```
 */
export function prefixOf(wire: string): string {
    const key = routeKeyOf(wire);
    return key.length <= HASH_LENGTH ? '' : key.slice(0, key.length - HASH_LENGTH);
}

/**
 * A typed customId. The single source of truth shared by the component that mints it and the handler
 * that reads it. This gives you typed reads on the `.customId` field in components. Values are packed
 * into a compact wire string, which fits more of them inside Discord's 100-char limit.
 *
 * @typeParam Prefix - The stable route prefix, e.g. 'approve'.
 * @typeParam Shape - The accumulated fields, filled in by the chain.
 *
 * @example
 * ```ts
 * import { ButtonHandler, ButtonRoute, CustomId } from '@seedcord/gateway';
 *
 * // declare this in the component file that mints the button
 * export const Approve = new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny']);
 *
 * \@ButtonRoute(Approve)
 * export class ApproveButton extends ButtonHandler<[typeof Approve]> {
 *     public async execute(): Promise<void> {
 *         const { userId, action } = this.params;
 *         // userId: string, action: 'approve' | 'deny'
 *
 *         await this.reply(`${action} for <@${userId}>`);
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Using it outside seedcord:
 * import { ButtonBuilder, Events } from 'discord.js';
 * import { CustomId } from '@seedcord/custom-id';
 *
 * // one declaration, imported by both sides
 * const Approve = new CustomId('approve').snowflake('userId').oneOf('action', ['approve', 'deny']);
 *
 * // minting, on the button you send
 * new ButtonBuilder().setCustomId(Approve.encode({ userId: '123', action: 'deny' })).setLabel('Deny');
 *
 * // reading, wherever your bot receives the click
 * client.on(Events.InteractionCreate, (interaction) => {
 *     if (!interaction.isButton()) return;
 *     if (!Approve.owns(interaction.customId)) return;
 *
 *     const { userId, action } = Approve.decode(interaction.customId);
 *     // userId: string, action: 'approve' | 'deny'
 * });
 * ```
 */
export class CustomId<Prefix extends string, Shape extends CustomIdShape = {}> {
    /** The stable route prefix, e.g. 'approve'. */
    readonly prefix: Prefix;
    /** The field definitions accumulated by the chain, keyed by name. */
    readonly shape: Shape;
    /** The prefix plus a short hash of the shape, the part of the wire before the colon. */
    readonly routeKey: string;

    constructor(prefix: Prefix, shape: Shape = {} as Shape) {
        // an empty prefix leaves the routeKey all-hash, which prefixOf then strips to nothing. a colon
        // or a control char breaks the wire framing.
        if (!prefix || /[:\x1B\x1F]/.test(prefix)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CustomIdInvalidPrefix, [prefix]);
        }
        this.prefix = prefix;
        this.shape = shape;
        this.routeKey = prefix + computeLayoutHash(shape);
    }

    // returning a fresh instance is what avoids an `as unknown as this` cast here.
    private add<Name extends string, Decoded>(
        name: Name,
        field: CustomIdField<Decoded>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Decoded>>> {
        // integer-like keys get reordered by js, which would scramble the field order.
        if (/^(?:0|[1-9]\d*)$/.test(name))
            throw new SeedcordTypeError(SeedcordErrorCode.CustomIdReservedFieldName, [name]);
        // a repeat name collapses the decoded type to never and overwrites the earlier field at runtime.
        if (name in this.shape) throw new SeedcordTypeError(SeedcordErrorCode.CustomIdDuplicateFieldName, [name]);
        // justified: the spread plus a computed key cannot be proven to the exact intersection
        const shape = { ...this.shape, [name]: field } as Shape & Record<Name, CustomIdField<Decoded>>;
        return new CustomId(this.prefix, shape);
    }

    /**
     * Add a Discord ID field, decoded as a string (the `Snowflake` type from discord-api-types).
     *
     * @example
     * ```ts
     * new CustomId('ban').snowflake('userId');
     * ```
     */
    snowflake<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<Snowflake, Nullable>>>> {
        return this.add<Name, Nullish<Snowflake, Nullable>>(name, { ...opts, kind: 'snowflake' });
    }

    /**
     * Add a UUID field, decoded as a lowercase uuid string.
     *
     * @example
     * ```ts
     * new CustomId('ticket').uuid('ticketId');
     * ```
     */
    uuid<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<string, Nullable>>>> {
        return this.add<Name, Nullish<string, Nullable>>(name, { ...opts, kind: 'uuid' });
    }

    /**
     * Add an integer field with no bounds, for a value up to 2^53.
     *
     * @example
     * ```ts
     * new CustomId('shop').int('amount');
     * ```
     */
    int<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<number, Nullable>>>>;
    /**
     * Add an integer field bounded by min and max, so it packs into fewer characters on the wire.
     *
     * @example
     * ```ts
     * new CustomId('paginate').int('page', 1, 50);
     * ```
     */
    int<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        min: number,
        max: number,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<number, Nullable>>>>;
    int<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        minOrOpts?: number | FieldOptions<Nullable>,
        max?: number,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<number, Nullable>>>> {
        const min = typeof minOrOpts === 'number' ? minOrOpts : undefined;
        if (min !== undefined && max !== undefined && min > max) {
            throw new SeedcordRangeError(SeedcordErrorCode.CustomIdInvalidBounds, [name, min, max]);
        }
        const options = typeof minOrOpts === 'number' ? opts : minOrOpts;
        const bounds = min === undefined || max === undefined ? {} : { min, max };
        return this.add<Name, Nullish<number, Nullable>>(name, { ...options, kind: 'int', ...bounds });
    }

    /**
     * Add a boolean flag.
     *
     * @example
     * ```ts
     * new CustomId('settings').bool('silent');
     * ```
     */
    bool<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<boolean, Nullable>>>> {
        return this.add<Name, Nullish<boolean, Nullable>>(name, { ...opts, kind: 'bool' });
    }

    /**
     * Add a field that is one value from a fixed list, decoded as the literal union. No `as const` needed.
     *
     * @example
     * ```ts
     * new CustomId('poll').oneOf('choice', ['yes', 'no', 'abstain']);
     * ```
     */
    oneOf<Name extends string, const Choices extends NonEmptyTuple<string>, const Nullable extends boolean = false>(
        name: Name,
        choices: Choices,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<Choices[number], Nullable>>>> {
        if (choices.length === 0) throw new SeedcordRangeError(SeedcordErrorCode.CustomIdEmptyChoices, [name]);
        return this.add<Name, Nullish<Choices[number], Nullable>>(name, { ...opts, kind: 'oneOf', choices });
    }

    /**
     * Add a free short text field. Avoid it where possible. It cannot be packed, which makes it the most
     * expensive field on the wire.
     *
     * @example
     * ```ts
     * new CustomId('note').str('message');
     * ```
     */
    str<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, Shape & Record<Name, CustomIdField<Nullish<string, Nullable>>>> {
        return this.add<Name, Nullish<string, Nullable>>(name, { ...opts, kind: 'string' });
    }

    /**
     * Mint a wire string from values. Throws if a value is out of its field's range or the wire is over 100 chars.
     *
     * @param values - One value per field, typed by the chain.
     * @returns The wire string to put on the component's customId.
     *
     * @example
     * ```ts
     * const Ticket = new CustomId('ticket').snowflake('ownerId').int('page', 1, 50);
     *
     * new ButtonBuilder().setCustomId(Ticket.encode({ ownerId: user.id, page: 3 })).setLabel('Next');
     *
     * // 900 falls outside the declared 1 to 50. this throws at runtime
     * Ticket.encode({ ownerId: user.id, page: 900 });
     * ```
     */
    encode(values: DecodedParams<Shape>): string {
        const wire = `${this.routeKey}:${encodeBody(this.shape, values)}`;
        if (wire.length > MAX_WIRE_LENGTH) {
            throw new SeedcordRangeError(SeedcordErrorCode.CustomIdWireTooLong, [wire.length]);
        }
        return wire;
    }

    /**
     * Read a wire string back into values.
     *
     * Throws two different errors. A wire minted before the shape changed throws the stale one. A
     * corrupt wire, or one minted by a different definition, throws the invalid one.
     * Use {@link setCustomIdErrors} to customize the two thrown Error classes.
     *
     * @param wire - The customId string from the interaction.
     * @returns The decoded values, typed by the chain.
     *
     * @example
     * ```ts
     * const Ticket = new CustomId('ticket').snowflake('ownerId').int('page', 1, 50);
     *
     * const { ownerId, page } = Ticket.decode(interaction.customId);
     * // ownerId: string, page: number
     *
     * // a message from an older deploy still carries its old button. catch the throw and answer it
     * try {
     *     Ticket.decode(interaction.customId);
     * } catch {
     *     await interaction.reply('This button is out of date. Run the command again.');
     * }
     * ```
     */
    decode(wire: string): DecodedParams<Shape> {
        const key = routeKeyOf(wire);
        if (key !== this.routeKey) {
            // same prefix but a different hash means the shape changed since this wire was minted.
            if (prefixOf(wire) === this.prefix) throw staleError(this.prefix);
            throw invalidError(`routeKey ${JSON.stringify(key)} is not ${JSON.stringify(this.routeKey)}`);
        }
        // justified: the codec returns runtime values and the shape guarantees their decoded types.
        return decodeBody(this.shape, wire.slice(key.length + 1)) as DecodedParams<Shape>;
    }

    /**
     * True if this wire was minted from this customId's prefix, ignoring the shape hash.
     *
     * Use it to pick which definition a click belongs to before decoding. {@link decodeFor} runs this
     * loop for you across several definitions.
     *
     * @param wire - The customId string from the interaction.
     *
     * @example
     * ```ts
     * // a button from an older deploy still matches here
     * if (!Approve.owns(interaction.customId)) return;
     * ```
     */
    owns(wire: string): boolean {
        return prefixOf(wire) === this.prefix;
    }
}

/** Any customId, whatever its prefix and fields. Write this to take one as a parameter. */
export type AnyCustomId = CustomId<string, CustomIdShape>;

/** The outcome of decoding a wire against several customIds, the matched prefix paired with its values. */
export type DecodedRoute<Defs extends readonly AnyCustomId[]> = {
    [Index in keyof Defs]: Defs[Index] extends AnyCustomId
        ? { readonly prefix: Defs[Index]['prefix']; readonly params: DecodedParams<Defs[Index]['shape']> }
        : never;
}[number];

/**
 * Decode a wire against several customIds at once, for a handler serving more than one.
 *
 * Matching runs on the prefix. The result pairs the matched prefix with that definition's own params.
 * Switching on `prefix` narrows both together.
 *
 * @param defs - The customId definitions to try, in order.
 * @param wire - The customId string from the interaction.
 * @returns The matched prefix and its decoded params.
 * @throws When no definition owns the wire, or when the matched one refuses it.
 *
 * @example
 * ```ts
 * const Approve = new CustomId('approve').snowflake('userId');
 * const Reject = new CustomId('reject').snowflake('userId').str('reason');
 *
 * const { prefix, params } = decodeFor([Approve, Reject], wire);
 * // params.reason exists on this branch alone
 * if (prefix === 'reject') await deny(params.userId, params.reason);
 * ```
 */
export function decodeFor<Defs extends readonly AnyCustomId[]>(defs: Defs, wire: string): DecodedRoute<Defs> {
    const match = defs.find((def) => def.owns(wire));
    if (!match) throw invalidError(`no customId owns ${JSON.stringify(routeKeyOf(wire))}`);
    // justified: the matched customId fixes both prefix and params together but find() loses that link.
    return { prefix: match.prefix, params: match.decode(wire) } as DecodedRoute<Defs>;
}
