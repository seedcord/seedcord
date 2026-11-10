import type { SelectInteraction } from './components/SelectMenuHandler';
import type { InteractionKind, MiddlewareKind } from '@seedcord/core';
import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction,
    APIMessageApplicationCommandInteraction,
    APIMessageChannelSelectInteractionData,
    APIMessageComponentButtonInteraction,
    APIMessageMentionableSelectInteractionData,
    APIMessageRoleSelectInteractionData,
    APIMessageStringSelectInteractionData,
    APIMessageUserSelectInteractionData,
    APIModalSubmitInteraction,
    APIUserApplicationCommandInteraction
} from 'discord-api-types/v10';

/** @internal */
export interface Payloads {
    [InteractionKind.Autocomplete]: APIApplicationCommandAutocompleteInteraction;
    [InteractionKind.Slash]: APIChatInputApplicationCommandInteraction;
    [InteractionKind.Button]: APIMessageComponentButtonInteraction;
    [InteractionKind.Modal]: APIModalSubmitInteraction;
    [InteractionKind.StringMenu]: SelectInteraction<APIMessageStringSelectInteractionData>;
    [InteractionKind.UserMenu]: SelectInteraction<APIMessageUserSelectInteractionData>;
    [InteractionKind.RoleMenu]: SelectInteraction<APIMessageRoleSelectInteractionData>;
    [InteractionKind.ChannelMenu]: SelectInteraction<APIMessageChannelSelectInteractionData>;
    [InteractionKind.MentionableMenu]: SelectInteraction<APIMessageMentionableSelectInteractionData>;
    [InteractionKind.MessageContextMenu]: APIMessageApplicationCommandInteraction;
    [InteractionKind.UserContextMenu]: APIUserApplicationCommandInteraction;
}

// indexing Payloads by every MiddlewareKind means a kind added to core breaks here until it is mapped
type InteractionForKind = { [Kind in MiddlewareKind]: Payloads[Kind] };

/** @internal */
export type InteractionOf<Kind extends MiddlewareKind> = InteractionForKind[Kind];
