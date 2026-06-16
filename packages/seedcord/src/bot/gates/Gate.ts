import type { Repliables, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents, Guild, User } from 'discord.js';

/**
 * Identity facts a gate reads on either side. A gate that only reads these runs on both an
 * interaction and an event with no `kind` check.
 */
export interface GateContextBase {
    readonly core: Core;
    readonly user: User | null;
    readonly guild: Guild | null;
    readonly guildId: string | null;
    readonly channelId: string | null;
}

/**
 * The interaction arm. `Repliable` is the interaction type the gate supports, inferred from the `ctx`
 * annotation, so a gate reading button-specific fields is rejected on a slash handler. `interaction`
 * is the reply target, so `user` is always present.
 */
export interface InteractionGateContext<Repliable extends Repliables = Repliables> extends GateContextBase {
    readonly kind: 'interaction';
    readonly interaction: Repliable;
    readonly user: User;
}

/**
 * The event arm. `Names` is the event(s) the gate supports, inferred from the `ctx` annotation, so a
 * gate that reads one event's `payload` is rejected on a handler for a different event. The default
 * supports every event.
 */
export interface EventGateContext<
    Names extends ValidNonInteractionKeys = ValidNonInteractionKeys
> extends GateContextBase {
    readonly kind: 'event';
    readonly eventName: Names;
    readonly payload: ClientEvents[Names];
}

/** What a gate's check receives. Narrow on `kind` to reach the interaction or the event payload. */
export type GateContext = InteractionGateContext | EventGateContext;

// phantom brand, so a bare check function or a plain object is rejected where a Gate is expected
declare const GateBrand: unique symbol;

/**
 * A precondition attached to a handler. It refuses by throwing a `Notice` (a reply) or a `Silence`
 * (a quiet drop), and passes by returning. `Ctx` is the context it requires, so a gate that reads
 * `ctx.interaction` is rejected on an event handler at compile time. `Name` is captured as a literal so
 * a mismatch error can name the gate. Build one with {@link defineGate}.
 *
 * The bound is `GateContextBase`, not the `GateContext` union, because the base has no `kind` and so
 * is not a union member. Binding to the union would collapse an identity gate's requirement to `never`.
 */
export interface Gate<Ctx extends GateContextBase = GateContext, Name extends string = string> {
    readonly name: Name;
    check(ctx: Ctx): Promise<void>;
    readonly [GateBrand]: true;
}

/**
 * A gate that carries a side effect, split so the effect fires only once the gate is the one that
 * let the request through. `check` peeks and refuses, `commit` applies the effect after the whole
 * gate set passes.
 */
export interface EffectGate<Ctx extends GateContextBase = GateContext, Name extends string = string> extends Gate<
    Ctx,
    Name
> {
    commit(ctx: Ctx): Promise<void>;
}

/**
 * Builds a {@link Gate} from a check. The check refuses by throwing and passes by returning, and may
 * be async. The required context is inferred from the `ctx` parameter, so annotate it as narrowly as
 * the fields the check reads. The brand means a bare function is not a gate.
 */
export function defineGate<const Name extends string, Ctx extends GateContextBase = GateContextBase>(
    name: Name,
    fn: (ctx: Ctx) => void | Promise<void>
): Gate<Ctx, Name> {
    // the brand is phantom (type-only), so this is the one cast that mints a Gate
    return { name, check: async (ctx) => fn(ctx) } as Gate<Ctx, Name>;
}

/** The context a {@link Gate} requires, recovered from its type for the `@Gated` and combinator checks. */
export type RequiredOf<TGate> = TGate extends Gate<infer Ctx> ? Ctx : never;
