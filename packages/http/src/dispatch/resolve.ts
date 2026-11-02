import { InteractionKind } from '@seedcord/core';
import { componentKindOf } from '@seedcord/core/internal';
import { prefixOf } from '@seedcord/custom-id';
import { ApplicationCommandType, InteractionType } from 'discord-api-types/v10';

import { UnhandledAutocomplete } from '#handlers/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';

import { slashRouteOf } from './slashRouteOf';

import type { HandlerConstructor } from '#handlers/constructors';
import type { RegisteredRoute, RouteMaps as CoreRouteMaps } from '@seedcord/core/internal';
import type { APIInteraction } from 'discord-api-types/v10';

/** A registered handler matched to an incoming interaction, under the keys the gateway dispatcher uses. */
export type ResolvedRoute = RegisteredRoute<HandlerConstructor>;

/** @internal */
export type RouteMap = Map<string, ResolvedRoute>;

export type RouteMaps = CoreRouteMaps<HandlerConstructor>;

function commandKind(type: ApplicationCommandType): InteractionKind | null {
    switch (type) {
        case ApplicationCommandType.ChatInput: {
            return InteractionKind.Slash;
        }
        case ApplicationCommandType.User: {
            return InteractionKind.UserContextMenu;
        }
        case ApplicationCommandType.Message: {
            return InteractionKind.MessageContextMenu;
        }
        default: {
            return null;
        }
    }
}

function unhandled(kind: InteractionKind, route: string): ResolvedRoute {
    return {
        kind,
        route,
        fallback: true,
        ctor: kind === InteractionKind.Autocomplete ? UnhandledAutocomplete : UnhandledRepliable
    };
}

/**
 * Matches a verified non-PING interaction to a registered handler. A known kind with no handler resolves
 * to the unhandled default. Null is an unrecognized payload shape, which the engine acks with a 202
 * without dispatching. Components and modals route by the stable customId prefix. A wire whose layout
 * hash drifted still reaches its handler, where decode refuses with `StaleCustomId`.
 */
export function resolve(maps: RouteMaps, interaction: APIInteraction): ResolvedRoute | null {
    switch (interaction.type) {
        case InteractionType.ApplicationCommand: {
            if (interaction.data.type === ApplicationCommandType.ChatInput) {
                const route = slashRouteOf(interaction.data);
                return maps[InteractionKind.Slash].get(route) ?? unhandled(InteractionKind.Slash, route);
            }
            const kind = commandKind(interaction.data.type);
            return kind ? (maps[kind].get(interaction.data.name) ?? unhandled(kind, interaction.data.name)) : null;
        }
        case InteractionType.ApplicationCommandAutocomplete: {
            const route = slashRouteOf(interaction.data);
            return maps[InteractionKind.Autocomplete].get(route) ?? unhandled(InteractionKind.Autocomplete, route);
        }
        case InteractionType.MessageComponent: {
            const key = componentKindOf(interaction.data.component_type);
            if (!key) return null;
            const prefix = prefixOf(interaction.data.custom_id);
            return maps[key].get(prefix) ?? unhandled(key, prefix);
        }
        case InteractionType.ModalSubmit: {
            const prefix = prefixOf(interaction.data.custom_id);
            return maps[InteractionKind.Modal].get(prefix) ?? unhandled(InteractionKind.Modal, prefix);
        }
        default: {
            return null;
        }
    }
}
