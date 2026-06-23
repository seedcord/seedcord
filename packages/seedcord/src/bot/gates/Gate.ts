import type { Repliables, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents, Guild, GuildMember, ModalSubmitInteraction, User } from 'discord.js';

/**
 * Fields present on both arms, so a gate reading only these needs no `kind` narrowing. Every field
 * except `core` is nullable here, since an event may carry no user or guild.
 *
 * @example
 * ```ts
 * // an agnostic gate reads only the base fields, so it fits any handler
 * const NeedsUser = defineGate('NeedsUser', (ctx: GateContextBase) => {
 *     if (!ctx.user) throw new NoUserNotice();
 * });
 * ```
 */
export interface GateContextBase {
    /** The running framework, for reaching the bot, config, the rate limiter, and the bus. */
    readonly core: Core;
    /** The acting user, or null on an event that carries none. */
    readonly user: User | null;
    /** The guild the action happened in, or null in a DM or a guildless event. */
    readonly guild: Guild | null;
    /** The acting member, or null outside a guild or when uncached. */
    readonly member: GuildMember | null;
    /** The guild id, or null outside a guild. */
    readonly guildId: string | null;
    /** The channel id, or null when the source carries none. */
    readonly channelId: string | null;
}

/**
 * The interaction arm. `Repliable` is the interaction type the gate supports, inferred from the `ctx`
 * annotation, so a gate reading button-specific fields is rejected on a slash handler. `interaction`
 * is the reply target, so `user` is always present. Use {@link NonModalInteraction} to exclude
 * ModalSubmit when the gate needs a reliable caller member or channel.
 *
 * @typeParam Repliable - The interaction type the gate reads, narrowing which handlers accept it.
 *
 * @example
 * ```ts
 * import type { ButtonInteraction } from 'discord.js';
 *
 * // a button-only gate: the Repliable generic narrows which handlers accept it
 * const ButtonGate = defineGate('btn', (ctx: InteractionGateContext<ButtonInteraction>) => {
 *     void ctx.interaction; // ButtonInteraction
 * });
 * ```
 */
export interface InteractionGateContext<Repliable extends Repliables = Repliables> extends GateContextBase {
    /** Marks the interaction arm, narrow on it before reading `interaction`. */
    readonly kind: 'interaction';
    /** The interaction being handled, which is the reply target. */
    readonly interaction: Repliable;
    /** The invoking user, always present on an interaction. */
    readonly user: User;
}

/**
 * The event arm. `Names` is the event(s) the gate supports, inferred from the `ctx` annotation, so a
 * gate that reads one event's `payload` is rejected on a handler for a different event. The default
 * supports every event.
 *
 * @typeParam Names - The event name or names the gate reads, typing `payload` to that event's args tuple.
 *
 * @example
 * ```ts
 * import { Events } from 'discord.js';
 *
 * // gate keyed to one event, so payload is typed to that event's args tuple
 * const OnMessage = defineGate('msg', (ctx: EventGateContext<Events.MessageCreate>) => {
 *     void ctx.payload; // [Message]
 * });
 * ```
 */
export interface EventGateContext<
    Names extends ValidNonInteractionKeys = ValidNonInteractionKeys
> extends GateContextBase {
    /** Marks the event arm, narrow on it before reading `payload`. */
    readonly kind: 'event';
    /** The event being handled. */
    readonly eventName: Names;
    /** The event's arguments, typed to that event's args tuple. */
    readonly payload: ClientEvents[Names];
}

/**
 * What a gate's check receives, tagged by `ctx.kind`. Narrow on `kind` before reading `interaction`
 * or `payload`.
 *
 * @see {@link InteractionGateContext}
 * @see {@link EventGateContext}
 *
 * @example
 * ```ts
 * // a gate that handles either arm narrows on ctx.kind
 * const Either = defineGate('either', (ctx: GateContext) => {
 *     if (ctx.kind === 'interaction') void ctx.interaction;
 *     else void ctx.payload;
 * });
 * ```
 */
export type GateContext = InteractionGateContext | EventGateContext;

/**
 * Every repliable interaction except ModalSubmit, the kinds with a reliable caller member and channel.
 * {@link RequirePermissions}, {@link RequireRole}, and {@link Nsfw} require this, which is why they are
 * a compile error on a modal handler.
 *
 * @example
 * ```ts
 * // gates needing a reliable caller member and channel exclude ModalSubmit
 * function MyGuard(): Gate<InteractionGateContext<NonModalInteraction>, 'MyGuard'> {
 *     return defineGate('MyGuard', (ctx: InteractionGateContext<NonModalInteraction>) => {
 *         void ctx.interaction.channel; // present on every non-modal interaction
 *     });
 * }
 * ```
 */
export type NonModalInteraction = Exclude<Repliables, ModalSubmitInteraction>;

// phantom brand, so a bare check function or a plain object is rejected where a Gate is expected
declare const GateBrand: unique symbol;

/**
 * A precondition attached to a handler. It refuses by throwing a `Notice` (a reply) or a `Silence`
 * (a quiet drop), and passes by returning. `Ctx` is the context it requires, so a gate that reads
 * `ctx.interaction` is rejected on an event handler at compile time. `Name` is captured as a literal so
 * a mismatch error can name the gate. Build one with {@link defineGate} or {@link defineEffectGate}.
 *
 * The bound is `GateContextBase`, not the `GateContext` union, because the base has no `kind` and so
 * is not a union member. Binding to the union would collapse an identity gate's requirement to `never`.
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
export interface Gate<Ctx extends GateContextBase = GateContext, Name extends string = string> {
    /** The gate's name, surfaced in a mismatch error and joined by the combinators. */
    readonly name: Name;
    /** Reads the context and refuses by throwing a Notice or a Silence, or passes by resolving. */
    check(ctx: Ctx): Promise<void>;

    /**
     * Phantom brand that marks a real gate, you never set or read it.
     *
     * @internal
     */
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
export interface EffectGate<Ctx extends GateContextBase = GateContext, Name extends string = string> extends Gate<
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
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * // a gate factory that takes its own option and closes over it
 * function MinRoleCount(min: number): Gate<InteractionGateContext, 'MinRoleCount'> {
 *     return defineGate('MinRoleCount', (ctx: InteractionGateContext) => {
 *         if (ctx.member && ctx.member.roles.cache.size < min) throw new NotEnoughRoles(min);
 *     });
 * }
 * ```
 *
 * @example
 * ```ts
 * // agnostic gate (no ctx annotation): fits any handler
 * const Owner = defineGate('owner', (ctx) => {
 *     if (!ctx.user) throw new NotOwner();
 * });
 * ```
 *
 * @example
 * ```ts
 * // interaction-only gate: annotate ctx to narrow the required context
 * const SlashGate = defineGate('slash', (ctx: InteractionGateContext) => {
 *     void ctx.interaction;
 * });
 * ```
 *
 * @example
 * ```ts
 * import { Events } from 'discord.js';
 *
 * // event-only gate keyed to one event
 * const OnMessage = defineGate('msg', (ctx: EventGateContext<Events.MessageCreate>) => {
 *     void ctx.payload;
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
 * @see {@link Gated}
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
 *             if (usedToday(ctx.user) >= max) throw new OutOfUsesNotice(max);
 *         },
 *         (ctx) => {
 *             // runs only after the whole gate set passes
 *             recordUse(ctx.user);
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
