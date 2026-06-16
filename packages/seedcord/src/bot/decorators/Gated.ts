import { runGates } from '@bot/gates';

import type {
    Gate,
    GateContext,
    GateContextBase,
    EventGateContext,
    InteractionGateContext,
    RequiredOf
} from '@bot/gates';
import type { ValidEventTypes } from '@handlers/BaseHandler';
import type { EventHandler } from '@handlers/event';
import type { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import type {
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    ChatInputCommandInteraction,
    MentionableSelectMenuInteraction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserContextMenuCommandInteraction,
    UserSelectMenuInteraction
} from 'discord.js';
import type { Constructor, NonEmptyTuple } from 'type-fest';

/**
 * A handler constructor `@Gated` accepts. The structural shape (not the generic) is the bound, because an
 * `unknown` bound collapses the handler-context inference in {@link ProvidedContext} to the wide `Repliables`,
 * which makes every per-kind rule unsound.
 */
type AnyHandlerCtor = abstract new (...args: never[]) => { execute(): Promise<void>; getEvent(): ValidEventTypes };

// a marker that satisfies no gate's required context (it lacks the base fields), so @Gated rejects a
// handler whose provided context is this
declare const UngateableBrand: unique symbol;
interface Ungateable {
    readonly [UngateableBrand]: true;
}

/**
 * The context a handler provides, read off its declared interaction or event type. An autocomplete handler
 * matches neither arm (it extends `BaseHandler` directly) and takes no gates because a refusal has no reply
 * target there, so it maps to {@link Ungateable}.
 */
type ProvidedContext<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends InteractionHandler<infer Repliable>
        ? InteractionGateContext<Repliable>
        : InstanceType<TCtor> extends EventHandler<infer Names>
          ? EventGateContext<Names>
          : Ungateable;

// the short label a context targets, so a mismatch error names the kind instead of dumping the raw
// (and TS-truncated) djs context type
type KindName<Ctx> = Ctx extends Ungateable
    ? 'autocomplete'
    : Ctx extends InteractionGateContext<infer R>
      ? R extends ChatInputCommandInteraction
          ? 'Slash'
          : R extends MessageContextMenuCommandInteraction
            ? 'MessageMenu'
            : R extends UserContextMenuCommandInteraction
              ? 'UserMenu'
              : R extends StringSelectMenuInteraction
                ? 'StringSelect'
                : R extends UserSelectMenuInteraction
                  ? 'UserSelect'
                  : R extends RoleSelectMenuInteraction
                    ? 'RoleSelect'
                    : R extends ChannelSelectMenuInteraction
                      ? 'ChannelSelect'
                      : R extends MentionableSelectMenuInteraction
                        ? 'MentionableSelect'
                        : R extends ButtonInteraction
                          ? 'Button'
                          : R extends ModalSubmitInteraction
                            ? 'Modal'
                            : 'an interaction'
      : Ctx extends EventGateContext<infer N>
        ? `${N & string} event`
        : 'an agnostic';

type GateMismatch<
    Name extends string,
    Want extends string,
    Got extends string
> = `gate '${Name}' wants a ${Want} handler but this handler is ${Got}`;

// the bracket-wrap stops a union provided-context from distributing into a vacuous-true match. on a
// mismatch the failure is a Constructor whose tuple message TS prints inline, so the @Gated error reads
// as a sentence instead of a truncated context dump
type GateFits<Provided, TGate> = [Provided] extends [RequiredOf<TGate>]
    ? TGate
    : TGate extends Gate<infer Req, infer Name>
      ? Constructor<[GateMismatch<Name, KindName<Req>, KindName<Provided>>]>
      : never;

type FitAll<TCtor extends AnyHandlerCtor, Gates extends readonly Gate<GateContextBase>[]> = {
    [Index in keyof Gates]: GateFits<ProvidedContext<TCtor>, Gates[Index]>;
};

/** @internal */
export const GatedMetadataKey = Symbol('gated:metadata');

/**
 * Attaches gates to a handler. The gates run before `execute`, and a gate refusing stops the handler with
 * the reply or drop the gate threw. A gate that requires a context the handler does not provide (a button
 * gate on a slash handler, an interaction gate on an event handler) is a compile error at this line.
 */
export function Gated<const Gates extends NonEmptyTuple<Gate<GateContextBase>>>(...gates: Gates) {
    // when every gate fits, FitAll equals Gates and the param is the real ctor, otherwise it is the error
    // mapping and applying the decorator to the real class is a TS1238 naming the offending gate
    return function <TCtor extends AnyHandlerCtor>(
        ctor: FitAll<TCtor, Gates> extends Gates ? TCtor : FitAll<TCtor, Gates>
    ): void {
        const existing = (Reflect.getMetadata(GatedMetadataKey, ctor) as readonly Gate[] | undefined) ?? [];
        Reflect.defineMetadata(GatedMetadataKey, [...existing, ...gates], ctor);
    };
}

/**
 * Runs the gates a handler was decorated with against the given context. The controller calls this before
 * `execute`, inside the boundary, so a refusal renders or drops.
 */
export async function runHandlerGates(handlerCtor: object, ctx: GateContext): Promise<void> {
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, ctx);
}
