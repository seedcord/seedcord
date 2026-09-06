import type { EventHandler } from '#handlers/event';
import type { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import type { ValidEventTypes } from '#src/handlers/interactionTypes';
import type { EventGateContext, InteractionGateContext } from './Gate';
import type { Gate, GateContextBase, RequiredOf } from '@seedcord/core';
import type { GateFitsWith } from '@seedcord/core/internal';
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

// a generic unknown bound would widen ProvidedContext to the full Repliables and break the per-kind checks
export type AnyHandlerCtor = abstract new (...args: never[]) => {
    execute(): Promise<void>;
    getEvent(): ValidEventTypes;
};

// a marker no gate's required context matches, so @Gated rejects every gate on an autocomplete handler
declare const UngateableBrand: unique symbol;
interface Ungateable {
    readonly [UngateableBrand]: true;
}

type ProvidedContext<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends InteractionHandler<infer Repliable>
        ? InteractionGateContext<Repliable>
        : InstanceType<TCtor> extends EventHandler<infer Names>
          ? EventGateContext<Names>
          : Ungateable;

// TS truncates the raw djs context type in a mismatch error
type KindName<Ctx> = Ctx extends Ungateable
    ? 'autocomplete'
    : Ctx extends InteractionGateContext<infer R>
      ? R extends ChatInputCommandInteraction
          ? 'Slash'
          : R extends MessageContextMenuCommandInteraction
            ? 'MessageContextMenu'
            : R extends UserContextMenuCommandInteraction
              ? 'UserContextMenu'
              : R extends StringSelectMenuInteraction
                ? 'StringMenu'
                : R extends UserSelectMenuInteraction
                  ? 'UserMenu'
                  : R extends RoleSelectMenuInteraction
                    ? 'RoleMenu'
                    : R extends ChannelSelectMenuInteraction
                      ? 'ChannelMenu'
                      : R extends MentionableSelectMenuInteraction
                        ? 'MentionableMenu'
                        : R extends ButtonInteraction
                          ? 'Button'
                          : R extends ModalSubmitInteraction
                            ? 'Modal'
                            : 'an interaction'
      : Ctx extends EventGateContext<infer N>
        ? `${N & string} event`
        : 'an agnostic';

// core defines the fit and this labels the kinds
export type FitAll<TCtor extends AnyHandlerCtor, Gates extends readonly Gate<GateContextBase>[]> = {
    [Index in keyof Gates]: GateFitsWith<
        ProvidedContext<TCtor>,
        KindName<ProvidedContext<TCtor>>,
        Gates[Index],
        KindName<RequiredOf<Gates[Index]>>
    >;
};
