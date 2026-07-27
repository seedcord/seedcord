import { HmrModuleHandler } from '@seedcord/core/hmr';
import { interactionRoutesOf, InteractionMetadataKey, InteractionRoutes } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Envapter } from 'envapt';

import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import { buildRouteMaps } from '@src/dispatch/resolve';
import { EMPTY_MANIFEST } from '@src/manifest/RouteManifest';

import type { HandlerConstructor } from '@handlers/constructors';
import type { Initializeable } from '@seedcord/core';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { ResolvedRoute, RouteMap, RouteMaps } from '@src/dispatch/resolve';

interface RouteTarget {
    readonly map: RouteMap;
    readonly kind: ResolvedRoute['kind'];
}

/**
 * Discovers interaction handlers from the filesystem into the engine's live route maps.
 *
 * The node host runs it at startup and dev HMR swaps map entries in place. The engine's `resolve`
 * reads `maps` per request. The edge path builds its maps from the generated manifest.
 */
export class InteractionDispatcher implements Initializeable, HmrAware {
    public readonly maps: RouteMaps;
    private readonly targets: Record<InteractionRoutes, RouteTarget>;

    /** @internal */
    public readonly logger = new Logger('Interactions');

    private isInitialized = false;
    private readonly hmrHandler?: HmrModuleHandler<HandlerConstructor, void, string[]>;
    // routeId -> owner row, the duplicate guard and the hmr unregister index
    private readonly rowOwners = new Map<string, { ctor: HandlerConstructor; target: RouteTarget; key: string }>();

    private loading = false;
    private readonly loadedHandlers: { name: string; from: string }[] = [];

    constructor(private readonly handlersDir: string) {
        this.maps = buildRouteMaps(EMPTY_MANIFEST);
        this.targets = this.buildTargets();

        if (!Envapter.isDevelopment && !Envapter.isTest) return;
        this.hmrHandler = new HmrModuleHandler({
            handlersDir,
            isHandler: this.isHandler.bind(this),
            registerHandler: this.registerHandler.bind(this),
            unregisterHandler: this.unregisterHandler.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.loading = true;
        this.loadedHandlers.length = 0;
        try {
            await traverseDirectory(this.handlersDir, (fullPath, relativePath, imported) => {
                for (const value of Object.values(imported)) {
                    if (!this.isHandler(value)) continue;
                    this.registerHandler(value, relativePath);
                    this.hmrHandler?.trackHandler(fullPath, value);
                }
            });
        } finally {
            this.loading = false;
        }

        this.logger.utils.block('Loaded handlers', [
            ...this.logger.utils.entries(this.loadedHandlers),
            ...this.logger.utils.counts({ routes: this.rowOwners.size })
        ]);
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    private isHandler(value: unknown): value is HandlerConstructor {
        if (typeof value !== 'function') return false;
        // this package's own family bases. A gateway handler in the same dir stays unregistered
        return (
            (value.prototype instanceof InteractionHandler || value.prototype instanceof AutocompleteHandler) &&
            Reflect.hasMetadata(InteractionMetadataKey, value)
        );
    }

    private getArtifacts(ctor: HandlerConstructor): string[] {
        const routeIds: string[] = [];
        for (const [routeId, owner] of this.rowOwners) {
            if (owner.ctor === ctor) routeIds.push(routeId);
        }
        return routeIds;
    }

    private targetFor(route: InteractionRoutes): RouteTarget {
        return this.targets[route];
    }

    private buildTargets(): Record<InteractionRoutes, RouteTarget> {
        return {
            [InteractionRoutes.Slash]: { map: this.maps.slash, kind: 'slash' },
            [InteractionRoutes.UserContextMenu]: { map: this.maps.userContextMenu, kind: 'userContextMenu' },
            [InteractionRoutes.MessageContextMenu]: { map: this.maps.messageContextMenu, kind: 'messageContextMenu' },
            [InteractionRoutes.Autocomplete]: { map: this.maps.autocomplete, kind: 'autocomplete' },
            [InteractionRoutes.Button]: { map: this.maps.components.button, kind: 'button' },
            [InteractionRoutes.StringMenu]: { map: this.maps.components.stringSelect, kind: 'stringMenu' },
            [InteractionRoutes.UserMenu]: { map: this.maps.components.userSelect, kind: 'userMenu' },
            [InteractionRoutes.RoleMenu]: { map: this.maps.components.roleSelect, kind: 'roleMenu' },
            [InteractionRoutes.ChannelMenu]: { map: this.maps.components.channelSelect, kind: 'channelMenu' },
            [InteractionRoutes.MentionableMenu]: {
                map: this.maps.components.mentionableSelect,
                kind: 'mentionableMenu'
            },
            [InteractionRoutes.Modal]: { map: this.maps.components.modal, kind: 'modal' }
        };
    }

    private registerHandler(ctor: HandlerConstructor, relativePath: string): void {
        // a partial registration would orphan routes and break hmr rollback
        const writes: [RouteTarget, string][] = [];

        for (const [route, keys] of interactionRoutesOf(ctor)) {
            const target = this.targetFor(route);
            for (const key of keys) {
                const existing = this.rowOwners.get(`${target.kind}:${key}`);
                // a different class on the same route would silently shadow (last write wins), so this throws
                if (existing && existing.ctor !== ctor) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                        key,
                        existing.ctor.name,
                        ctor.name
                    ]);
                }
                writes.push([target, key]);
            }
        }

        if (writes.length === 0) return;
        for (const [target, key] of writes) {
            const routeId = `${target.kind}:${key}`;
            // a one-export module, the dispatch first-handler scan resolves exactly this row's class
            target.map.set(key, { kind: target.kind, routeId, load: () => Promise.resolve({ [ctor.name]: ctor }) });
            this.rowOwners.set(routeId, { ctor, target, key });
        }

        const from = formatFilePath(relativePath);
        if (this.loading) this.loadedHandlers.push({ name: ctor.name, from });
        else this.logger.utils.registration(ctor.name, from);
    }

    private unregisterHandler(ctor: HandlerConstructor, artifacts?: string[]): void {
        const routeIds = artifacts ?? this.getArtifacts(ctor);
        for (const routeId of routeIds) {
            const owner = this.rowOwners.get(routeId);
            if (owner?.ctor !== ctor) continue;
            this.rowOwners.delete(routeId);
            owner.target.map.delete(owner.key);
        }
    }
}
