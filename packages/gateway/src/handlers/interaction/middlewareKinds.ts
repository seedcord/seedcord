import type { InteractionKind, MiddlewareKind } from '@seedcord/core';
import type {
    AutocompleteInteraction,
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

/** @internal */
export interface Payloads {
    [InteractionKind.Autocomplete]: AutocompleteInteraction;
    [InteractionKind.Slash]: ChatInputCommandInteraction;
    [InteractionKind.Button]: ButtonInteraction;
    [InteractionKind.Modal]: ModalSubmitInteraction;
    [InteractionKind.StringMenu]: StringSelectMenuInteraction;
    [InteractionKind.UserMenu]: UserSelectMenuInteraction;
    [InteractionKind.RoleMenu]: RoleSelectMenuInteraction;
    [InteractionKind.ChannelMenu]: ChannelSelectMenuInteraction;
    [InteractionKind.MentionableMenu]: MentionableSelectMenuInteraction;
    [InteractionKind.MessageContextMenu]: MessageContextMenuCommandInteraction;
    [InteractionKind.UserContextMenu]: UserContextMenuCommandInteraction;
}

// indexing Payloads by every MiddlewareKind means a kind added to core breaks here until it is mapped
type InteractionForKind = { [Kind in MiddlewareKind]: Payloads[Kind] };

/** @internal */
export type InteractionOf<Kind extends MiddlewareKind> = InteractionForKind[Kind];
