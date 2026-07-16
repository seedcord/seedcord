import type { Core } from '@interfaces/Core';
import type { GateContextBase } from '@seedcord/core';
import type { Repliables, ValidNonInteractionKeys } from '@src/handlers/interactionTypes';
import type { ClientEvents, Guild, GuildMember, User } from 'discord.js';

/**
 * The interaction arm. It extends the scalar {@link GateContextBase} with the live interaction and
 * the rich djs objects the gateway cache provides. `Repliable` is the interaction type the gate
 * supports, inferred from the `ctx` annotation, so a gate reading button-specific fields is rejected
 * on a slash handler. `interaction` is the reply target, so `user` is always present. Use
 * {@link NonModalInteraction} to exclude ModalSubmit when the gate needs a reliable caller member or
 * channel.
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
    /** The running framework, with the gateway's bot and bus. */
    readonly core: Core;
    /** The interaction being handled, which is the reply target. */
    readonly interaction: Repliable;
    /** The invoking user, always present on an interaction. */
    readonly user: User;
    /** The guild the interaction happened in, or null in a DM. */
    readonly guild: Guild | null;
    /** The invoking member from the cache, or null outside a guild or when uncached. */
    readonly member: GuildMember | null;
}

/**
 * The event arm. It extends the scalar {@link GateContextBase} with the event payload and the djs
 * objects derived from it. `Names` is the event(s) the gate supports, inferred from the `ctx`
 * annotation, so a gate that reads one event's `payload` is rejected on a handler for a different
 * event. The default supports every event.
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
    /** The running framework, with the gateway's bot and bus. */
    readonly core: Core;
    /** The event being handled. */
    readonly eventName: Names;
    /** The event's arguments, typed to that event's args tuple. */
    readonly payload: ClientEvents[Names];
    /** The acting user derived from the payload, or null when the event carries none. */
    readonly user: User | null;
    /** The guild derived from the payload, or null. */
    readonly guild: Guild | null;
    /** The acting member derived from the payload, or null. */
    readonly member: GuildMember | null;
}

/**
 * What a gateway gate's check receives, tagged by `ctx.kind`. Narrow on `kind` before reading
 * `interaction` or `payload`.
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
