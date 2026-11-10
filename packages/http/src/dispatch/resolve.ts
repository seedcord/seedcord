import { InteractionKind } from '@seedcord/core';
import { matchRoute, unhandledSlots } from '@seedcord/core/internal';
import { prefixOf } from '@seedcord/custom-id';
import {
    isChatInputApplicationCommandInteraction,
    isMessageComponentButtonInteraction,
    isMessageComponentSelectMenuInteraction
} from 'discord-api-types/utils/v10';
import { ApplicationCommandType, ComponentType, InteractionType } from 'discord-api-types/v10';

import { UnhandledAutocomplete } from '#handlers/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';

import { slashRouteOf } from './slashRouteOf';

import type { HandlerSlots, ResolvedInteraction } from '#handlers/constructors';
import type { SelectInteraction } from '#handlers/interaction/components/SelectMenuHandler';
import type { Payloads } from '#handlers/interaction/middlewareKinds';
import type { RouteMaps as CoreRouteMaps } from '@seedcord/core/internal';
import type {
    APIApplicationCommandInteraction,
    APIInteraction,
    APIMessageApplicationCommandInteraction,
    APIMessageChannelSelectInteractionData,
    APIMessageComponentInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIMessageMentionableSelectInteractionData,
    APIMessageRoleSelectInteractionData,
    APIMessageStringSelectInteractionData,
    APIMessageUserSelectInteractionData,
    APIUserApplicationCommandInteraction
} from 'discord-api-types/v10';

export type RouteMaps = CoreRouteMaps<HandlerSlots>;

const UNHANDLED: HandlerSlots = unhandledSlots(UnhandledRepliable, UnhandledAutocomplete);

interface SelectData {
    [ComponentType.StringSelect]: APIMessageStringSelectInteractionData;
    [ComponentType.UserSelect]: APIMessageUserSelectInteractionData;
    [ComponentType.RoleSelect]: APIMessageRoleSelectInteractionData;
    [ComponentType.ChannelSelect]: APIMessageChannelSelectInteractionData;
    [ComponentType.MentionableSelect]: APIMessageMentionableSelectInteractionData;
}

// discord-api-types keeps these discriminants on data, and a check on data doesn't narrow the interaction
function isSelect<Type extends keyof SelectData>(
    interaction: APIMessageComponentSelectMenuInteraction,
    type: Type
): interaction is SelectInteraction<SelectData[Type]> {
    return interaction.data.component_type === type;
}

function isUserCommand(
    interaction: APIApplicationCommandInteraction
): interaction is APIUserApplicationCommandInteraction {
    return interaction.data.type === ApplicationCommandType.User;
}

function isMessageCommand(
    interaction: APIApplicationCommandInteraction
): interaction is APIMessageApplicationCommandInteraction {
    return interaction.data.type === ApplicationCommandType.Message;
}

function resolved<Kind extends InteractionKind>(
    maps: RouteMaps,
    kind: Kind,
    key: string,
    event: Payloads[Kind]
): ResolvedInteraction<Kind> {
    return { ...matchRoute(maps, kind, key, UNHANDLED), event };
}

function resolveCommand(maps: RouteMaps, interaction: APIApplicationCommandInteraction): ResolvedInteraction | null {
    if (isChatInputApplicationCommandInteraction(interaction)) {
        return resolved(maps, InteractionKind.Slash, slashRouteOf(interaction.data), interaction);
    }
    if (isUserCommand(interaction)) {
        return resolved(maps, InteractionKind.UserContextMenu, interaction.data.name, interaction);
    }
    if (isMessageCommand(interaction)) {
        return resolved(maps, InteractionKind.MessageContextMenu, interaction.data.name, interaction);
    }
    return null;
}

// components and modals route by the stable customId prefix
function resolveComponent(maps: RouteMaps, interaction: APIMessageComponentInteraction): ResolvedInteraction | null {
    const key = prefixOf(interaction.data.custom_id);
    if (isMessageComponentButtonInteraction(interaction)) {
        return resolved(maps, InteractionKind.Button, key, interaction);
    }
    if (!isMessageComponentSelectMenuInteraction(interaction)) return null;
    if (isSelect(interaction, ComponentType.StringSelect)) {
        return resolved(maps, InteractionKind.StringMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.UserSelect)) {
        return resolved(maps, InteractionKind.UserMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.RoleSelect)) {
        return resolved(maps, InteractionKind.RoleMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.ChannelSelect)) {
        return resolved(maps, InteractionKind.ChannelMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.MentionableSelect)) {
        return resolved(maps, InteractionKind.MentionableMenu, key, interaction);
    }
    return null;
}

/**
 * Matches a verified non-PING interaction to a registered handler. A known kind without a handler resolves
 * to the unhandled default. Null is an unrecognized payload shape, which the engine acks with a 202
 * without dispatching. A wire whose layout hash drifted still reaches its handler, where decode refuses
 * with `StaleCustomId`.
 */
export function resolve(maps: RouteMaps, interaction: APIInteraction): ResolvedInteraction | null {
    switch (interaction.type) {
        case InteractionType.ApplicationCommand: {
            return resolveCommand(maps, interaction);
        }
        case InteractionType.ApplicationCommandAutocomplete: {
            return resolved(maps, InteractionKind.Autocomplete, slashRouteOf(interaction.data), interaction);
        }
        case InteractionType.MessageComponent: {
            return resolveComponent(maps, interaction);
        }
        case InteractionType.ModalSubmit: {
            return resolved(maps, InteractionKind.Modal, prefixOf(interaction.data.custom_id), interaction);
        }
        default: {
            return null;
        }
    }
}
