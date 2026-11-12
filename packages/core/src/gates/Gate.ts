import type { CoreBase } from '#interfaces/CoreBase';
import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchOrigin } from '#src/dispatch/DispatchOrigin';
import type { DispatchMemberValues } from '@seedcord/types';
import type { Promisable } from 'type-fest';

/**
 * The transport-agnostic gate context, the scalar identity of the acting user resolvable from any
 * transport's payload. Every field except `core` is nullable, since an event or DM may carry no
 * guild or member. Each transport extends it with its own context. For example, the gateway adds the djs
 * `user`/`guild`/`member` objects and the live interaction or event payload.
 *
 * @example
 * ```ts
 * // a gate reading only the base fields fits any handler on any transport
 * const NeedsGuild = defineGate('NeedsGuild', (ctx: GateContextBase) => {
 *     if (!ctx.guildId) throw new NotInGuild();
 * });
 * ```
 */
export interface GateContextBase extends DispatchOrigin, DispatchMemberValues {
    /** Gates read the config and the rate limiter through it. */
    readonly core: CoreBase;
    /**
     * The member's role ids without the everyone role, the shape a raw interaction payload
     * contains. Empty outside a guild or when the source contains none.
     */
    readonly memberRoleIds: readonly string[];
    /**
     * The member's permission bits, or null outside a guild. On an interaction these are the
     * channel-scoped permissions the payload contains, and on a gateway event they're the member's guild-level ones.
     */
    readonly memberPermissions: bigint | null;
    /**
     * The bag for this dispatch, the same instance the handler and its middleware hold. Every middleware
     * runs before the first gate. A gate can therefore read what a middleware wrote.
     */
    readonly dispatch: DispatchContext;
}

/**
 * The context the guild-scoped permission gates require. It adds the base permission sets computed from
 * roles alone, which only the gateway transport can provide from its cache. The http transport's context
 * does not define these fields.
 *
 * @example
 * ```ts
 * // in:'guild' returns a Gate<GuildPermissionsContext>, which fits only a gateway handler
 * \@Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
 * ```
 */
export interface GuildPermissionsContext extends GateContextBase {
    /**
     * The member's base permission set, roles only, matching djs `GuildMember.permissions`. Null when the
     * member is unavailable.
     */
    readonly memberGuildPermissions: bigint | null;
    /**
     * The bot's base permission set from the transport's cache. It's `0n` in a guild the bot isn't in. It's null
     * when the guild is cached but the bot's member isn't.
     */
    readonly appGuildPermissions: bigint | null;
}

/**
 * The context an interaction provides on both transports, where Discord always sends the bot's channel
 * permissions. A gate that requires it doesn't fit any event handler.
 *
 * @example
 * ```ts
 * // the default channel scope returns a Gate<AppPermissionsContext>
 * \@Gated(RequireBotPermissions([PermissionFlagsBits.ManageMessages]))
 * ```
 */
export interface AppPermissionsContext extends GateContextBase {
    /** The bot's permissions in the invoked channel, the wire `app_permissions` value. */
    readonly appPermissions: bigint;
}

// phantom brand rejects a bare check function or plain object where a Gate is expected
declare const GateBrand: unique symbol;

/**
 * A precondition attached to a handler. It refuses by throwing a `Notice` (a reply) or a `Silence`
 * (no reply), and passes by returning. `Ctx` is the context it requires, so a gate that reads
 * a field absent on a handler's context is rejected at compile time. `Name` is captured as a literal so
 * a mismatch error can name the gate. Build one with {@link defineGate} or {@link defineEffectGate}.
 *
 * @typeParam Ctx - The context that the gate requires. A field missing from it is a compile error.
 * @typeParam Name - The gate's literal name, named in a mismatch error.
 *
 * @example
 * ```ts
 * // a factory returning a typed, agnostic gate
 * function MyGate(): Gate<GateContextBase, 'MyGate'> {
 *     return defineGate('MyGate', (ctx) => {
 *         if (shouldRefuse(ctx)) throw new MyNotice();
 *     });
 * }
 * ```
 *
 * @see {@link defineGate}
 */
export interface Gate<Ctx extends GateContextBase = GateContextBase, Name extends string = string> {
    /** The gate's name, surfaced in a mismatch error and joined by the combinators. */
    readonly name: Name;
    /** Reads the context and refuses by throwing a Notice or a Silence, or passes by resolving. */
    check(ctx: Ctx): Promise<void>;

    /** @internal */
    readonly [GateBrand]: true;
}

/**
 * A gate whose `check` method can refuse a request without applying its side effect. `commit` applies
 * the effect after every gate passes. {@link Cooldown} is the catalog gate that returns one. Build one with
 * {@link defineEffectGate}.
 *
 * @typeParam Ctx - The context both `check` and `commit` require. A field missing from it fails to compile.
 * @typeParam Name - The literal name a mismatch error prints.
 *
 * @example
 * ```ts
 * // a factory returning a typed effect gate
 * function MyEffectGate(): EffectGate<GateContextBase, 'MyEffectGate'> {
 *     return defineEffectGate(
 *         'MyEffectGate',
 *         (ctx) => {
 *             if (shouldRefuse(ctx)) throw new MyNotice();
 *         },
 *         (ctx) => {
 *             applyMyEffect(ctx);
 *         }
 *     );
 * }
 * ```
 *
 * @see {@link defineEffectGate}
 */
export interface EffectGate<Ctx extends GateContextBase = GateContextBase, Name extends string = string> extends Gate<
    Ctx,
    Name
> {
    /** Applies the side effect, run only after the whole gate set passes. */
    commit(ctx: Ctx): Promise<void>;
}

/**
 * Builds a {@link Gate} from a check. The check refuses by throwing a Notice or a Silence and passes
 * by returning. Annotate `ctx` as narrowly as the fields the check reads, because the required context
 * is inferred from it. No annotation defaults to {@link GateContextBase}, an agnostic gate that fits
 * every handler.
 *
 * @typeParam Name - The gate's name, captured as a literal for mismatch errors.
 * @typeParam Ctx - The context that the check reads, inferred from the `ctx` annotation.
 *
 * @param name - The gate's name, used in mismatch errors.
 * @param fn - The check, which refuses by throwing a Notice or a Silence and passes by returning.
 *
 * @see {@link defineEffectGate}
 * @see the `@Gated` decorator from your transport package
 *
 * @example
 * ```ts
 * // a gate factory that takes its own option and closes over it
 * function MinRoles(min: number): Gate<GateContextBase, 'MinRoles'> {
 *     return defineGate('MinRoles', (ctx) => {
 *         if (ctx.memberRoleIds.length < min) throw new NotEnoughRoles(min);
 *     });
 * }
 * ```
 *
 * @example
 * ```ts
 * // agnostic gate (no ctx annotation): fits any handler
 * const Owner = defineGate('owner', (ctx) => {
 *     if (!ctx.userId) throw new NotOwner();
 * });
 * ```
 */
export function defineGate<const Name extends string, Ctx extends GateContextBase = GateContextBase>(
    name: Name,
    fn: (ctx: Ctx) => Promisable<void>
): Gate<Ctx, Name> {
    return { name, check: async (ctx) => fn(ctx) } as Gate<Ctx, Name>;
}

/**
 * Builds an {@link EffectGate} from a `check` and a `commit`. `check` peeks and refuses by throwing, and
 * `commit` applies the side effect, running only once the whole gate set passes so a later refusal never
 * commits. In an `or`, seedcord rolls back the commit a refusing gate queued. This is how {@link Cooldown} peeks
 * in `check` and charges the slot in `commit`.
 *
 * @typeParam Name - The gate's literal name, used to name a mismatch error.
 * @typeParam Ctx - The context both `check` and `commit` read, inferred from the `ctx` annotation.
 *
 * @param name - The gate's name, used in mismatch errors.
 * @param check - Peeks and refuses by throwing, without applying the side effect.
 * @param commit - Applies the side effect, running only after the whole gate set passes.
 *
 * @see {@link defineGate}
 * @see the `@Gated` decorator from your transport package
 * @see {@link Cooldown}
 *
 * @example
 * ```ts
 * // an effect-gate factory that takes its own limit and closes over it
 * function UsesPerDay(max: number): EffectGate<GateContextBase, 'UsesPerDay'> {
 *     return defineEffectGate(
 *         'UsesPerDay',
 *         (ctx) => {
 *             // peek and refuse by throwing. do not mutate yet
 *             if (usedToday(ctx.userId) >= max) throw new OutOfUsesNotice(max);
 *         },
 *         (ctx) => {
 *             // runs only after the whole gate set passes
 *             recordUse(ctx.userId);
 *         }
 *     );
 * }
 * ```
 */
export function defineEffectGate<const Name extends string, Ctx extends GateContextBase = GateContextBase>(
    name: Name,
    check: (ctx: Ctx) => Promisable<void>,
    commit: (ctx: Ctx) => Promisable<void>
): EffectGate<Ctx, Name> {
    return {
        name,
        check: async (ctx) => check(ctx),
        commit: async (ctx) => commit(ctx)
    } as EffectGate<Ctx, Name>;
}

/**
 * The context a {@link Gate} requires.
 *
 * @typeParam TGate - The gate type to read the required context from.
 *
 * @example
 * ```ts
 * type OwnerCtx = RequiredOf<ReturnType<typeof OwnerOnly>>; // GateContextBase
 * ```
 */
export type RequiredOf<TGate> = TGate extends Gate<infer Ctx> ? Ctx : never;
