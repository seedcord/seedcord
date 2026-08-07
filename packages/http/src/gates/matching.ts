import type { InteractionGateContext } from './Gate';
import type { RepliableHandler } from '@handlers/RepliableHandler';
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

// a non-RepliableHandler (AutocompleteHandler) maps to Ungateable, which has no reply target for a refusal
type ProvidedContext<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends RepliableHandler<infer Event> ? InteractionGateContext<Event> : Ungateable;

type SelectData<Repliable> = Repliable extends APIMessageComponentSelectMenuInteraction ? Repliable['data'] : never;

// a mismatch error names the kind where TS would otherwise truncate the raw API type
// GuildPermissionsContext labels as gateway-only, because the http context does not define its guild fields
type KindName<Ctx> = Ctx extends Ungateable
    ? 'autocomplete'
    : Ctx extends GuildPermissionsContext
      ? 'gateway (guild permissions)'
      : Ctx extends InteractionGateContext<infer Repliable>
        ? Repliable extends APIChatInputApplicationCommandInteraction
            ? 'Slash'
            : Repliable extends APIMessageApplicationCommandInteraction
              ? 'MessageMenu'
              : Repliable extends APIUserApplicationCommandInteraction
                ? 'UserMenu'
                : SelectData<Repliable> extends APIMessageStringSelectInteractionData
                  ? 'StringSelect'
                  : SelectData<Repliable> extends APIMessageUserSelectInteractionData
                    ? 'UserSelect'
                    : SelectData<Repliable> extends APIMessageRoleSelectInteractionData
                      ? 'RoleSelect'
                      : SelectData<Repliable> extends APIMessageChannelSelectInteractionData
                        ? 'ChannelSelect'
                        : SelectData<Repliable> extends APIMessageMentionableSelectInteractionData
                          ? 'MentionableSelect'
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
