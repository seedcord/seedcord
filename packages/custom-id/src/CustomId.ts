import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';

import { computeLayoutHash, decodeBody, encodeBody, HASH_LENGTH } from './codec';
import { invalidError, staleError } from './errors';

import type { CustomIdField, CustomIdShape, DecodedParams, WithField } from './Field';
import type { Snowflake } from 'discord-api-types/v10';
import type { NonEmptyTuple } from 'type-fest';

// discord caps a customId at 100 chars.
const MAX_WIRE_LENGTH = 100;

/** Per-field options every {@link CustomId} chain method takes. */
export interface FieldOptions<Nullable extends boolean = boolean> {
    /**
     * Set to `true` to let the field hold null. It costs one extra slot on the wire.
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
 * Strip the layout hash off a wire and return the prefix that the customId was declared with.
 *
 * Route on this. Changing a shape doesn't change its prefix, so a click on a component built before the
 * change still reaches the same handler. {@link CustomId.decode} then throws the stale error there.
 * Returns an empty string when the wire is missing its colon or its routeKey is too short to carry a hash.
 *
 * @param wire - The customId string from the interaction.
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
 * A typed customId. Declare it once and import it in both the component that encodes it and the
 * handler that decodes it, so both sides read the same typed fields. It packs the values into a compact
 * wire string, which fits more of them in Discord's 100-char limit.
 *
 * @typeParam Prefix - The stable route prefix, e.g. 'approve'.
 * @typeParam Shape - The fields that the chain methods add.
 *
 * @example
 * ```ts
 * import { ButtonHandler, ButtonRoute, CustomId } from '@seedcord/gateway';
 *
 * // declare this in the component file that builds the button
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
 * // encoding, on the button you send
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
    /** The field definitions, keyed by name. */
    readonly shape: Shape;
    /** The prefix plus a short hash of the shape, the part of the wire before the colon. */
    readonly routeKey: string;

    constructor(prefix: Prefix, shape: Shape = {} as Shape) {
        // prefixOf strips an all-hash routeKey down to '', so an empty prefix could never route. a colon
        // or one of the codec's control chars would break the wire framing.
        if (!prefix || /[:\x1B\x1F]/.test(prefix)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CustomIdInvalidPrefix, [prefix]);
        }
        this.prefix = prefix;
        this.shape = shape;
        this.routeKey = prefix + computeLayoutHash(shape);
    }

    // a fresh instance avoids an `as unknown as this` cast
    private add<Name extends string, Decoded>(
        name: Name,
        field: CustomIdField<Decoded>
    ): CustomId<Prefix, WithField<Shape, Name, Decoded>> {
        if (/^(?:0|[1-9]\d*)$/.test(name))
            throw new SeedcordTypeError(SeedcordErrorCode.CustomIdReservedFieldName, [name]);
        // a repeat name collapses the decoded type to never and overwrites the earlier field at runtime.
        if (name in this.shape) {
            throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [`customId ${this.prefix} field`, name]);
        }
        return new CustomId(this.prefix, { ...this.shape, [name]: field });
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
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<Snowflake, Nullable>>> {
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
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<string, Nullable>>> {
        return this.add<Name, Nullish<string, Nullable>>(name, { ...opts, kind: 'uuid' });
    }

    /**
     * Add an integer field without bounds, for a value up to 2^53.
     *
     * @example
     * ```ts
     * new CustomId('shop').int('amount');
     * ```
     */
    int<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<number, Nullable>>>;
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
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<number, Nullable>>>;
    int<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        minOrOpts?: number | FieldOptions<Nullable>,
        max?: number,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<number, Nullable>>> {
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
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<boolean, Nullable>>> {
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
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<Choices[number], Nullable>>> {
        if (choices.length === 0) throw new SeedcordRangeError(SeedcordErrorCode.CustomIdEmptyChoices, [name, 'oneOf']);
        return this.add<Name, Nullish<Choices[number], Nullable>>(name, { ...opts, kind: 'oneOf', choices });
    }

    /**
     * Add a field that holds any subset of a fixed list, decoded as an array of the literal union.
     *
     * Encode collapses a repeated pick into one. Decode returns the picks in declaration order. Each
     * choice costs one bit on the wire.
     *
     * @example
     * ```ts
     * // a member picks roles in a select menu, and the confirm button carries them
     * // roles: ('reader' | 'artist' | 'vip')[]
     * new CustomId('assign').someOf('roles', ['reader', 'artist', 'vip']);
     * ```
     */
    someOf<Name extends string, const Choices extends NonEmptyTuple<string>, const Nullable extends boolean = false>(
        name: Name,
        choices: Choices,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<Choices[number][], Nullable>>> {
        if (choices.length === 0)
            throw new SeedcordRangeError(SeedcordErrorCode.CustomIdEmptyChoices, [name, 'someOf']);
        return this.add<Name, Nullish<Choices[number][], Nullable>>(name, { ...opts, kind: 'someOf', choices });
    }

    /**
     * Add a free text field. It's the most expensive field on the wire because it can't be packed, so
     * use another kind where one fits.
     *
     * @example
     * ```ts
     * new CustomId('note').str('message');
     * ```
     */
    str<Name extends string, const Nullable extends boolean = false>(
        name: Name,
        opts?: FieldOptions<Nullable>
    ): CustomId<Prefix, WithField<Shape, Name, Nullish<string, Nullable>>> {
        return this.add<Name, Nullish<string, Nullable>>(name, { ...opts, kind: 'string' });
    }

    /**
     * Encode the values into a wire string.
     *
     * @param values - One value per field, typed by the chain.
     * @returns The wire string to put on the component's customId.
     * @throws A **SeedcordTypeError** when a value is the wrong kind for its field.
     * @throws A **SeedcordRangeError** when a value is outside its field's bounds.
     * @throws A **SeedcordRangeError** when the wire is over 100 characters.
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
            throw new SeedcordRangeError(SeedcordErrorCode.CustomIdWireTooLong, [this.prefix, wire.length]);
        }
        return wire;
    }

    /**
     * Read a wire string back into values. Use {@link setCustomIdErrors} to change the two errors it throws.
     *
     * @param wire - The customId string from the interaction.
     * @throws The stale error when the wire was encoded before the shape changed. The default is a **SeedcordError**.
     * @throws The invalid error when the wire is corrupt or was encoded by a different definition. The default is a **SeedcordError**.
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
            // same prefix with a different hash means the shape changed after this wire was encoded
            if (prefixOf(wire) === this.prefix) throw staleError(this.prefix);
            throw invalidError(`routeKey ${JSON.stringify(key)} is not ${JSON.stringify(this.routeKey)}`);
        }
        // justified: decodeBody builds each value from its field in this.shape
        return decodeBody(this.shape, wire.slice(key.length + 1)) as DecodedParams<Shape>;
    }

    /**
     * Returns `true` when the wire's prefix matches this customId's, whatever its shape hash.
     *
     * Use it to pick which definition a click belongs to before decoding. {@link decodeFor} does this
     * check across several definitions for you.
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

/** Any customId, whatever its prefix and fields. Use it to type a parameter that takes one. */
export type AnyCustomId = CustomId<string, CustomIdShape>;

/** What {@link decodeFor} returns, the matched prefix with its params. */
export type DecodedRoute<Defs extends readonly AnyCustomId[]> = {
    [Index in keyof Defs]: Defs[Index] extends AnyCustomId
        ? { readonly prefix: Defs[Index]['prefix']; readonly params: DecodedParams<Defs[Index]['shape']> }
        : never;
}[number];

/**
 * Decode a wire against several customIds at once, for a handler that takes more than one.
 *
 * It decodes with the first definition whose prefix matches the wire. Switching on `prefix` narrows
 * `params` to that definition's fields.
 *
 * @param defs - The customId definitions to try, in order.
 * @param wire - The customId string from the interaction.
 * @throws The invalid error from {@link setCustomIdErrors} when the wire's prefix doesn't match any definition.
 * @throws What {@link CustomId.decode} throws when the matched definition rejects the wire.
 *
 * @example
 * ```ts
 * const Approve = new CustomId('approve').snowflake('userId');
 * const Reject = new CustomId('reject').snowflake('userId').str('reason');
 *
 * const { prefix, params } = decodeFor([Approve, Reject], wire);
 * // params.reason only exists on this branch
 * if (prefix === 'reject') await deny(params.userId, params.reason);
 * ```
 */
export function decodeFor<Defs extends readonly AnyCustomId[]>(defs: Defs, wire: string): DecodedRoute<Defs> {
    const match = defs.find((def) => def.owns(wire));
    if (!match) throw invalidError(`no customId owns ${JSON.stringify(routeKeyOf(wire))}`);
    // justified: find() returns AnyCustomId, so the compiler can't tie prefix to params here
    return { prefix: match.prefix, params: match.decode(wire) } as DecodedRoute<Defs>;
}
