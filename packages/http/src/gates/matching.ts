import type { RepliableHandler } from '#handlers/RepliableHandler';
import type { InteractionGateContext } from './Gate';
import type { Gate, GateContextBase, GuildPermissionsContext, RequiredOf } from '@seedcord/core';
import type { GateFitsWith } from '@seedcord/core/internal';
import type {
    APIChatInputApplicationCommandInteraction,
    APIMessageApplicationCommandInteraction,
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIMessageChannelSelectInteractionData,
    APIMessageMentionableSelectInteractionData,
    APIMessageRoleSelectInteractionData,
    APIMessageStringSelectInteractionData,
    APIMessageUserSelectInteractionData,
    APIModalSubmitInteraction,
    APIUserApplicationCommandInteraction
} from 'discord-api-types/v10';

export type AnyHandlerCtor = abstract new (...args: never[]) => {
    execute(): Promise<void>;
};

// @Gated rejects every gate on an autocomplete handler through this marker
declare const UngateableBrand: unique symbol;
interface Ungateable {
    readonly [UngateableBrand]: true;
}

type ProvidedContext<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends RepliableHandler<infer Event> ? InteractionGateContext<Event> : Ungateable;

type SelectData<Repliable> = Repliable extends APIMessageComponentSelectMenuInteraction ? Repliable['data'] : never;

type SelectKindName<Data> = Data extends APIMessageStringSelectInteractionData
    ? 'StringMenu'
    : Data extends APIMessageUserSelectInteractionData
      ? 'UserMenu'
      : Data extends APIMessageRoleSelectInteractionData
        ? 'RoleMenu'
        : Data extends APIMessageChannelSelectInteractionData
          ? 'ChannelMenu'
          : Data extends APIMessageMentionableSelectInteractionData
            ? 'MentionableMenu'
            : 'an interaction';

// TS truncates the raw API type in a mismatch error
type KindName<Ctx> = Ctx extends Ungateable
    ? 'autocomplete'
    : // the http context defines no guild permission fields
      Ctx extends GuildPermissionsContext
      ? 'gateway (guild permissions)'
      : Ctx extends InteractionGateContext<infer Repliable>
        ? Repliable extends APIChatInputApplicationCommandInteraction
            ? 'Slash'
            : Repliable extends APIMessageApplicationCommandInteraction
              ? 'MessageContextMenu'
              : Repliable extends APIUserApplicationCommandInteraction
                ? 'UserContextMenu'
                : // keep this guard. SelectData is never for a button, and never is assignable to StringSelect.
                  Repliable extends APIMessageComponentSelectMenuInteraction
                  ? SelectKindName<SelectData<Repliable>>
                  : Repliable extends APIMessageComponentButtonInteraction
                    ? 'Button'
                    : Repliable extends APIModalSubmitInteraction
                      ? 'Modal'
                      : 'an interaction'
        : 'an agnostic';

export type FitAll<TCtor extends AnyHandlerCtor, Gates extends readonly Gate<GateContextBase>[]> = {
    [Index in keyof Gates]: GateFitsWith<
        ProvidedContext<TCtor>,
        KindName<ProvidedContext<TCtor>>,
        Gates[Index],
        KindName<RequiredOf<Gates[Index]>>
    >;
};
