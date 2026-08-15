import { prefixOf, type InteractionRoutes } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { ApplicationCommandType, ComponentType, InteractionType } from 'discord-api-types/v10';

import { UnhandledAutocomplete } from '#handlers/defaults/UnhandledAutocomplete';
import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';

import { slashRouteOf } from './slashRouteOf';

import type { ComponentRoute, RouteManifest, RouteModule } from '#src/manifest/RouteManifest';
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
    /** The key the router looked up. */
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

// the manifest names selects `xSelect`, the resolved kinds name them `xMenu`
type ResolvedKindOf<Kind extends ComponentMapKey> = Kind extends `${infer Base}Select` ? `${Base}Menu` : Kind;

const COMPONENT_KIND = {
    button: 'button',
    stringSelect: 'stringMenu',
    userSelect: 'userMenu',
    roleSelect: 'roleMenu',
    channelSelect: 'channelMenu',
    mentionableSelect: 'mentionableMenu',
    modal: 'modal'
} satisfies { [Kind in ComponentMapKey]: ResolvedKindOf<Kind> & ResolvedKind };

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
            button: new Map(),
            stringSelect: new Map(),
            userSelect: new Map(),
            roleSelect: new Map(),
            channelSelect: new Map(),
            mentionableSelect: new Map(),
            modal: new Map()
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
        set(maps.components[row.kind], COMPONENT_KIND[row.kind], row.prefix, row);
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
            return maps.components[key].get(prefix) ?? unhandled(COMPONENT_KIND[key], prefix);
        }
        case InteractionType.ModalSubmit: {
            const prefix = prefixOf(interaction.data.custom_id);
            return maps.components.modal.get(prefix) ?? unhandled('modal', prefix);
        }
        default: {
            return null;
        }
    }
}
