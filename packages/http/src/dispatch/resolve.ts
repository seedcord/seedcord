import { InteractionKind } from '@seedcord/core';
import { prefixOf } from '@seedcord/custom-id';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { ApplicationCommandType, ComponentType, InteractionType } from 'discord-api-types/v10';

import { UnhandledAutocomplete } from '#handlers/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';

import { slashRouteOf } from './slashRouteOf';

import type { ComponentRoute, RouteManifest, RouteModule } from '#src/manifest/RouteManifest';
import type { APIInteraction } from 'discord-api-types/v10';

type ResolvedKind = `${InteractionKind}`;

/** A manifest row matched to an incoming interaction, keyed the way the gateway dispatcher keys. */
export interface ResolvedRoute {
    readonly kind: ResolvedKind;
    /**
     * The stable dispatch id, `kind:key` (`slash:ban`), the shape core's `routeIdOf` builds. Null for the
     * unhandled default, which matches no row.
     */
    readonly routeId: string | null;
    readonly attemptedKey?: string;
    /** Resolves the one export the row registers. */
    readonly load: () => Promise<unknown>;
}

/** @internal */
export type RouteMap = Map<string, ResolvedRoute>;

type ComponentMapKey = ComponentRoute['kind'];

export interface RouteMaps {
    readonly slash: RouteMap;
    readonly userContextMenu: RouteMap;
    readonly messageContextMenu: RouteMap;
    readonly autocomplete: RouteMap;
    readonly components: Readonly<Record<ComponentMapKey, RouteMap>>;
}

type CommandMapKey = Exclude<keyof RouteMaps, 'components' | 'autocomplete'>;

function commandKind(type: ApplicationCommandType): CommandMapKey | null {
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

function componentMapKey(type: ComponentType): Exclude<ComponentMapKey, InteractionKind.Modal> | null {
    switch (type) {
        case ComponentType.Button: {
            return InteractionKind.Button;
        }
        case ComponentType.StringSelect: {
            return InteractionKind.StringMenu;
        }
        case ComponentType.UserSelect: {
            return InteractionKind.UserMenu;
        }
        case ComponentType.RoleSelect: {
            return InteractionKind.RoleMenu;
        }
        case ComponentType.ChannelSelect: {
            return InteractionKind.ChannelMenu;
        }
        case ComponentType.MentionableSelect: {
            return InteractionKind.MentionableMenu;
        }
        default: {
            return null;
        }
    }
}

function namedExport(routeId: string, row: RouteModule): () => Promise<unknown> {
    return async () => {
        let moduleExports: Awaited<ReturnType<typeof row.load>>;
        try {
            moduleExports = await row.load();
        } catch (caught) {
            throw new SeedcordError(SeedcordErrorCode.RouteModuleLoadFailed, [routeId, row.from], { cause: caught });
        }
        if (!Object.hasOwn(moduleExports, row.exportName)) {
            throw new SeedcordError(SeedcordErrorCode.InteractionRouteExportMissing, [
                routeId,
                row.exportName,
                row.from
            ]);
        }
        return moduleExports[row.exportName];
    };
}

function describeRow(row: RouteModule): string {
    return `${row.exportName} (${row.from})`;
}

/**
 * Builds the per-kind lookup maps.
 *
 * @throws A **SeedcordError** when two rows resolve to the same route.
 */
export function buildRouteMaps(manifest: RouteManifest): RouteMaps {
    const maps: RouteMaps = {
        slash: new Map(),
        userContextMenu: new Map(),
        messageContextMenu: new Map(),
        autocomplete: new Map(),
        components: {
            [InteractionKind.Button]: new Map(),
            [InteractionKind.StringMenu]: new Map(),
            [InteractionKind.UserMenu]: new Map(),
            [InteractionKind.RoleMenu]: new Map(),
            [InteractionKind.ChannelMenu]: new Map(),
            [InteractionKind.MentionableMenu]: new Map(),
            [InteractionKind.Modal]: new Map()
        }
    };
    const owners = new Map<string, RouteModule>();

    function set(map: RouteMap, kind: ResolvedKind, key: string, row: RouteModule): void {
        const routeId = `${kind}:${key}`;
        const owner = owners.get(routeId);
        if (owner) {
            // a bare map.set would let a later row shadow an earlier one
            throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                routeId,
                describeRow(owner),
                describeRow(row)
            ]);
        }
        owners.set(routeId, row);
        map.set(key, { kind, routeId, load: namedExport(routeId, row) });
    }

    for (const row of manifest.commandRoutes) {
        const kind = commandKind(row.type);
        if (kind) set(maps[kind], kind, row.name, row);
    }
    for (const row of manifest.autocompleteRoutes) {
        set(maps.autocomplete, 'autocomplete', row.name, row);
    }
    for (const row of manifest.componentRoutes) {
        set(maps.components[row.kind], row.kind, row.prefix, row);
    }
    return maps;
}

// dispatched through the normal pipeline like the gateway's unhandled default
function unhandled(kind: ResolvedKind, attemptedKey: string): ResolvedRoute {
    return {
        kind,
        routeId: null,
        attemptedKey,
        load: () => Promise.resolve(kind === 'autocomplete' ? UnhandledAutocomplete : UnhandledRepliable)
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
                const route = slashRouteOf(interaction.data);
                return maps.slash.get(route) ?? unhandled('slash', route);
            }
            const kind = commandKind(interaction.data.type);
            return kind ? (maps[kind].get(interaction.data.name) ?? unhandled(kind, interaction.data.name)) : null;
        }
        case InteractionType.ApplicationCommandAutocomplete: {
            const route = slashRouteOf(interaction.data);
            return maps.autocomplete.get(route) ?? unhandled('autocomplete', route);
        }
        case InteractionType.MessageComponent: {
            const key = componentMapKey(interaction.data.component_type);
            if (!key) return null;
            const prefix = prefixOf(interaction.data.custom_id);
            return maps.components[key].get(prefix) ?? unhandled(key, prefix);
        }
        case InteractionType.ModalSubmit: {
            const prefix = prefixOf(interaction.data.custom_id);
            return maps.components[InteractionKind.Modal].get(prefix) ?? unhandled(InteractionKind.Modal, prefix);
        }
        default: {
            return null;
        }
    }
}
