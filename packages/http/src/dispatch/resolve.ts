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
import type { UnhandledHandler } from '#interfaces/Config';
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

export interface Routes {
    readonly maps: RouteMaps;
    readonly unhandled: HandlerSlots;
}

export function routesOf(maps: RouteMaps, unhandled?: UnhandledHandler): Routes {
    return { maps, unhandled: unhandledSlots(unhandled ?? UnhandledRepliable, UnhandledAutocomplete) };
}

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
    routes: Routes,
    kind: Kind,
    key: string,
    event: Payloads[Kind]
): ResolvedInteraction<Kind> {
    return { ...matchRoute(routes.maps, kind, key, routes.unhandled), event };
}

function resolveCommand(routes: Routes, interaction: APIApplicationCommandInteraction): ResolvedInteraction | null {
    if (isChatInputApplicationCommandInteraction(interaction)) {
        return resolved(routes, InteractionKind.Slash, slashRouteOf(interaction.data), interaction);
    }
    if (isUserCommand(interaction)) {
        return resolved(routes, InteractionKind.UserContextMenu, interaction.data.name, interaction);
    }
    if (isMessageCommand(interaction)) {
        return resolved(routes, InteractionKind.MessageContextMenu, interaction.data.name, interaction);
    }
    return null;
}

// components and modals route by the stable customId prefix
function resolveComponent(routes: Routes, interaction: APIMessageComponentInteraction): ResolvedInteraction | null {
    const key = prefixOf(interaction.data.custom_id);
    if (isMessageComponentButtonInteraction(interaction)) {
        return resolved(routes, InteractionKind.Button, key, interaction);
    }
    if (!isMessageComponentSelectMenuInteraction(interaction)) return null;
    if (isSelect(interaction, ComponentType.StringSelect)) {
        return resolved(routes, InteractionKind.StringMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.UserSelect)) {
        return resolved(routes, InteractionKind.UserMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.RoleSelect)) {
        return resolved(routes, InteractionKind.RoleMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.ChannelSelect)) {
        return resolved(routes, InteractionKind.ChannelMenu, key, interaction);
    }
    if (isSelect(interaction, ComponentType.MentionableSelect)) {
        return resolved(routes, InteractionKind.MentionableMenu, key, interaction);
    }
    return null;
}

/**
 * Matches a verified non-PING interaction to a registered handler. A known kind without a handler resolves
 * to the unhandled default. Null is an unrecognized payload shape, which the engine acks with a 202
 * without dispatching. A wire whose layout hash drifted still reaches its handler, where decode refuses
 * with `StaleCustomId`.
 */
export function resolve(routes: Routes, interaction: APIInteraction): ResolvedInteraction | null {
    switch (interaction.type) {
        case InteractionType.ApplicationCommand: {
            return resolveCommand(routes, interaction);
        }
        case InteractionType.ApplicationCommandAutocomplete: {
            return resolved(routes, InteractionKind.Autocomplete, slashRouteOf(interaction.data), interaction);
        }
        case InteractionType.MessageComponent: {
            return resolveComponent(routes, interaction);
        }
        case InteractionType.ModalSubmit: {
            return resolved(routes, InteractionKind.Modal, prefixOf(interaction.data.custom_id), interaction);
        }
        default: {
            return null;
        }
    }
}
