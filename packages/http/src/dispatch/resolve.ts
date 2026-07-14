import { prefixOf, type InteractionRoutes } from '@seedcord/core/internal';
import { ApplicationCommandType, ComponentType, InteractionType } from 'discord-api-types/v10';

import { UnhandledAutocomplete } from '@handlers/defaults/UnhandledAutocomplete';
import { UnhandledEvent } from '@handlers/defaults/UnhandledEvent';

import { slashRouteOf } from './slashRouteOf';

import type { ComponentRoute, RouteManifest } from '@src/manifest/RouteManifest';
import type { APIInteraction } from 'discord-api-types/v10';

type ResolvedKind = `${InteractionRoutes}`;

/** A manifest row matched to an incoming interaction, keyed the way the gateway dispatcher keys. */
export interface ResolvedRoute {
    readonly kind: ResolvedKind;
    /**
     * The stable dispatch id, `kind:key` (`slash:ban`), the shape core's `routeIdOf` builds. Null for the
     * unhandled default, which matches no row.
     */
    readonly routeId: string | null;
    readonly load: () => Promise<unknown>;
}

type RouteMap = Map<string, ResolvedRoute>;

type ComponentMapKey = ComponentRoute['kind'];

export interface RouteMaps {
    readonly slash: RouteMap;
    readonly userContextMenu: RouteMap;
    readonly messageContextMenu: RouteMap;
    readonly autocomplete: RouteMap;
    readonly components: Readonly<Record<ComponentMapKey, RouteMap>>;
}

const COMPONENT_KIND: Record<ComponentMapKey, ResolvedKind> = {
    button: 'button',
    stringSelect: 'stringMenu',
    userSelect: 'userMenu',
    roleSelect: 'roleMenu',
    channelSelect: 'channelMenu',
    mentionableSelect: 'mentionableMenu',
    modal: 'modal'
};

function commandKind(type: ApplicationCommandType): 'slash' | 'userContextMenu' | 'messageContextMenu' | null {
    switch (type) {
        case ApplicationCommandType.ChatInput: {
            return 'slash';
        }
        case ApplicationCommandType.User: {
            return 'userContextMenu';
        }
        case ApplicationCommandType.Message: {
            return 'messageContextMenu';
        }
        default: {
            return null;
        }
    }
}

function componentMapKey(type: ComponentType): Exclude<ComponentMapKey, 'modal'> | null {
    switch (type) {
        case ComponentType.Button: {
            return 'button';
        }
        case ComponentType.StringSelect: {
            return 'stringSelect';
        }
        case ComponentType.UserSelect: {
            return 'userSelect';
        }
        case ComponentType.RoleSelect: {
            return 'roleSelect';
        }
        case ComponentType.ChannelSelect: {
            return 'channelSelect';
        }
        case ComponentType.MentionableSelect: {
            return 'mentionableSelect';
        }
        default: {
            return null;
        }
    }
}

function set(map: RouteMap, kind: ResolvedKind, key: string, load: () => Promise<unknown>): void {
    map.set(key, { kind, routeId: `${kind}:${key}`, load });
}

/** Builds the per-kind lookup maps. */
export function buildRouteMaps(manifest: RouteManifest): RouteMaps {
    const maps: RouteMaps = {
        slash: new Map(),
        userContextMenu: new Map(),
        messageContextMenu: new Map(),
        autocomplete: new Map(),
        components: {
            button: new Map(),
            stringSelect: new Map(),
            userSelect: new Map(),
            roleSelect: new Map(),
            channelSelect: new Map(),
            mentionableSelect: new Map(),
            modal: new Map()
        }
    };
    for (const row of manifest.commands) {
        const kind = commandKind(row.type);
        if (kind) set(maps[kind], kind, row.name, row.load);
    }
    for (const row of manifest.autocomplete) {
        set(maps.autocomplete, 'autocomplete', row.name, row.load);
    }
    for (const row of manifest.components) {
        set(maps.components[row.kind], COMPONENT_KIND[row.kind], row.prefix, row.load);
    }
    return maps;
}

// dispatched through the normal pipeline like the gateway's unhandled default
function unhandled(kind: ResolvedKind): ResolvedRoute {
    return {
        kind,
        routeId: null,
        load: () => Promise.resolve(kind === 'autocomplete' ? { UnhandledAutocomplete } : { UnhandledEvent })
    };
}

/**
 * Matches a verified non-PING interaction to its manifest row. A known kind with no row resolves to the
 * unhandled default, whose handler replies "Feature not implemented yet." (empty choices on autocomplete).
 * Null is an unrecognized payload shape, which the engine acks with a 202 without dispatching.
 * Components and modals route by the stable customId prefix, so a wire whose layout hash drifted still
 * routes to its handler, where decode refuses with `StaleCustomId`.
 */
export function resolve(maps: RouteMaps, interaction: APIInteraction): ResolvedRoute | null {
    switch (interaction.type) {
        case InteractionType.ApplicationCommand: {
            if (interaction.data.type === ApplicationCommandType.ChatInput) {
                return maps.slash.get(slashRouteOf(interaction.data)) ?? unhandled('slash');
            }
            const kind = commandKind(interaction.data.type);
            return kind ? (maps[kind].get(interaction.data.name) ?? unhandled(kind)) : null;
        }
        case InteractionType.ApplicationCommandAutocomplete: {
            return maps.autocomplete.get(slashRouteOf(interaction.data)) ?? unhandled('autocomplete');
        }
        case InteractionType.MessageComponent: {
            const key = componentMapKey(interaction.data.component_type);
            if (!key) return null;
            return maps.components[key].get(prefixOf(interaction.data.custom_id)) ?? unhandled(COMPONENT_KIND[key]);
        }
        case InteractionType.ModalSubmit: {
            return maps.components.modal.get(prefixOf(interaction.data.custom_id)) ?? unhandled('modal');
        }
        default: {
            return null;
        }
    }
}
