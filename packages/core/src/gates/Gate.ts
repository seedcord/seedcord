import type { CoreBase } from '@interfaces/CoreBase';

/**
 * The transport-agnostic gate context, the scalar identity of the acting user resolvable from any
 * transport's payload. Every field except `core` is nullable, since an event or DM may carry no
 * guild or member. Each transport extends it with its own rich arm. For e.g., the gateway adds the djs
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
export interface GateContextBase {
    /** Gates read the config and the rate limiter through it. */
    readonly core: CoreBase;
    /** The acting user's id, or null on an event that carries none. */
    readonly userId: string | null;
    /** The guild id, or null outside a guild. */
    readonly guildId: string | null;
    /** The channel id, or null when the source carries none. */
    readonly channelId: string | null;
    /**
     * The member's role ids without the everyone role, the shape a raw interaction payload
     * contains. Empty outside a guild or when the source contains none.
     */
    readonly memberRoleIds: readonly string[];
    /**
     * The member's permission bits, or null outside a guild. On an interaction these are the
     * channel-scoped permissions the payload contains, on a gateway event the member's guild-level ones.
     */
    readonly memberPermissions: bigint | null;
    /**
     * The dispatched handler as `kind:route` (`slash:daily`, `button:confirm`), or null off a route (a
     * plain event handler, or a gate run outside a handler). `runHandlerGates` populates it from the handler's
     * metadata. `Cooldown` uses it so its window is stable across restarts and isolates.
     */
    readonly routeId: string | null;
}

// phantom brand, so a bare check function or a plain object is rejected where a Gate is expected
declare const GateBrand: unique symbol;

/**
 * A precondition attached to a handler. It refuses by throwing a `Notice` (a reply) or a `Silence`
 * (a drop with no reply), and passes by returning. `Ctx` is the context it requires, so a gate that reads
 * a field absent on a handler's context is rejected at compile time. `Name` is captured as a literal so
 * a mismatch error can name the gate. Build one with {@link defineGate} or {@link defineEffectGate}.
 *
 * @typeParam Ctx - The context the gate requires, so reading a field absent on a handler's context is a compile error.
 * @typeParam Name - The gate's name captured as a literal, so a mismatch error can name the gate.
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
 * A gate that carries a side effect, split so the effect fires only once the gate is the one that
 * let the request through. `check` peeks and refuses, `commit` applies the effect after the whole
 * gate set passes. {@link Cooldown} is the catalog gate that returns one. Build one with
 * {@link defineEffectGate}.
 *
 * @typeParam Ctx - The context the gate requires, so reading a field absent on a handler's context is a compile error.
 * @typeParam Name - The gate's name captured as a literal, so a mismatch error can name the gate.
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
 * by returning. The required context is inferred from `ctx`, so annotate it as narrowly as the fields
 * the check reads. No annotation defaults to {@link GateContextBase}, an agnostic gate that fits every
 * handler.
 *
 * @typeParam Name - The gate's name captured as a literal, so a mismatch error can name the gate.
 * @typeParam Ctx - The context the check reads, inferred from the `ctx` annotation.
 *
 * @param name - The gate's name, used in mismatch errors.
 * @param fn - The check, which refuses by throwing a Notice or a Silence and passes by returning.
 *
 * @see {@link defineEffectGate}
 * @see the `@Gated` decorator from `seedcord`
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
    fn: (ctx: Ctx) => void | Promise<void>
): Gate<Ctx, Name> {
    return { name, check: async (ctx) => fn(ctx) } as Gate<Ctx, Name>;
}

/**
 * Builds an {@link EffectGate} from a `check` and a `commit`. `check` peeks and refuses by throwing, and
 * `commit` applies the side effect, running only once the whole gate set passes so a later refusal never
 * commits. In an `or`, a refusing arm's queued commit is rolled back. This is how {@link Cooldown} peeks
 * in `check` and charges the slot in `commit`.
 *
 * @typeParam Name - The gate's name captured as a literal, so a mismatch error can name the gate.
 * @typeParam Ctx - The context both `check` and `commit` read, inferred from the `ctx` annotation.
 *
 * @param name - The gate's name, used in mismatch errors.
 * @param check - Peeks and refuses by throwing, without applying the side effect.
 * @param commit - Applies the side effect, running only after the whole gate set passes.
 *
 * @see {@link defineGate}
 * @see the `@Gated` decorator from `seedcord`
 * @see {@link Cooldown}
 *
 * @example
 * ```ts
 * // an effect-gate factory that takes its own limit and closes over it
 * function UsesPerDay(max: number): EffectGate<GateContextBase, 'UsesPerDay'> {
 *     return defineEffectGate(
 *         'UsesPerDay',
 *         (ctx) => {
 *             // peek and refuse by throwing, do not mutate yet
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
    check: (ctx: Ctx) => void | Promise<void>,
    commit: (ctx: Ctx) => void | Promise<void>
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
