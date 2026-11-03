import { InteractionKind } from '@seedcord/core';
import { componentKindOf, matchRoute } from '@seedcord/core/internal';
import { prefixOf } from '@seedcord/custom-id';
import { ApplicationCommandType, InteractionType } from 'discord-api-types/v10';

import { UnhandledAutocomplete } from '#handlers/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';

import { slashRouteOf } from './slashRouteOf';

import type { HandlerConstructor } from '#handlers/constructors';
import type { RegisteredRoute, RouteMaps as CoreRouteMaps } from '@seedcord/core/internal';
import type { APIInteraction } from 'discord-api-types/v10';

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

const UNHANDLED: { repliable: HandlerConstructor; autocomplete: HandlerConstructor } = {
    repliable: UnhandledRepliable,
    autocomplete: UnhandledAutocomplete
};

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
                return matchRoute(maps, InteractionKind.Slash, slashRouteOf(interaction.data), UNHANDLED);
            }
            const kind = commandKind(interaction.data.type);
            return kind && matchRoute(maps, kind, interaction.data.name, UNHANDLED);
        }
        case InteractionType.ApplicationCommandAutocomplete: {
            return matchRoute(maps, InteractionKind.Autocomplete, slashRouteOf(interaction.data), UNHANDLED);
        }
        case InteractionType.MessageComponent: {
            const kind = componentKindOf(interaction.data.component_type);
            return kind && matchRoute(maps, kind, prefixOf(interaction.data.custom_id), UNHANDLED);
        }
        case InteractionType.ModalSubmit: {
            return matchRoute(maps, InteractionKind.Modal, prefixOf(interaction.data.custom_id), UNHANDLED);
        }
        default: {
            return null;
        }
    }
}
