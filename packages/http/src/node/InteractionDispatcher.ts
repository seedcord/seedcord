import { HmrModuleHandler } from '@seedcord/core/hmr';
import { interactionRoutesOf, InteractionMetadataKey, InteractionRoutes } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Envapter } from 'envapt';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import { buildRouteMaps } from '#src/dispatch/resolve';
import { EMPTY_MANIFEST } from '#src/manifest/RouteManifest';

import type { HandlerConstructor } from '#handlers/constructors';
import type { ResolvedRoute, RouteMap, RouteMaps } from '#src/dispatch/resolve';
import type { Initializeable } from '@seedcord/core';
import type { ContextMenuLeaves } from '@seedcord/core/internal';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';

interface RouteTarget {
    readonly map: RouteMap;
    readonly kind: ResolvedRoute['kind'];
}

// hmr swaps entries live and resolve() reads per request, but edge builds from manifest instead
export class InteractionDispatcher implements Initializeable, HmrAware {
    public readonly maps: RouteMaps;
    private readonly targets: Record<InteractionRoutes, RouteTarget>;

    /** @internal */
    public readonly logger = new Logger('Interactions', { channel: 'interactions' });

    private isInitialized = false;
    private readonly hmrHandler?: HmrModuleHandler<HandlerConstructor, void, string[]>;
    // routeId -> owner row, the duplicate guard and the hmr unregister index
    private readonly rowOwners = new Map<
        string,
        { ctor: HandlerConstructor; target: RouteTarget; key: string; from: string }
    >();

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

        this.logger.utils.block(
            'Loaded handlers',
            [
                ...this.logger.utils.entries(this.loadedHandlers),
                ...this.logger.utils.counts({ routes: this.rowOwners.size })
            ],
            'debug'
        );
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    public warnUnhandledRoutes(commandLeaves: Iterable<string>): void {
        this.warnMissing(commandLeaves, this.maps.slash, 'Slash route', '@SlashRoute');
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        this.warnMissing(leaves.user, this.maps.userContextMenu, 'User context menu', '@ContextMenuRoute');
        this.warnMissing(leaves.message, this.maps.messageContextMenu, 'Message context menu', '@ContextMenuRoute');
    }

    private warnMissing(names: Iterable<string>, map: RouteMap, label: string, decorator: string): void {
        for (const name of names) {
            if (map.has(name)) continue;
            this.logger.warn(`${label} ${paint.sky.bold(name)} has no registered ${paint.bold(decorator)} handler.`);
        }
    }

    private isHandler(value: unknown): value is HandlerConstructor {
        if (typeof value !== 'function') return false;
        // this package's own family bases, so a gateway handler in the same dir stays unregistered
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
        const from = formatFilePath(relativePath);
        // a partial registration would orphan routes and break hmr rollback
        const writes: [RouteTarget, string][] = [];

        for (const [route, keys] of interactionRoutesOf(ctor)) {
            const target = this.targetFor(route);
            for (const key of keys) {
                const routeId = `${target.kind}:${key}`;
                const existing = this.rowOwners.get(routeId);
                // a different class on the same route silently shadows the existing one (last write wins)
                if (existing && existing.ctor !== ctor) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                        routeId,
                        `${existing.ctor.name} (${existing.from})`,
                        `${ctor.name} (${from})`
                    ]);
                }
                writes.push([target, key]);
            }
        }

        if (writes.length === 0) return;
        for (const [target, key] of writes) {
            const routeId = `${target.kind}:${key}`;
            target.map.set(key, { kind: target.kind, routeId, load: () => Promise.resolve(ctor) });
            this.rowOwners.set(routeId, { ctor, target, key, from });
        }

        if (this.loading) this.loadedHandlers.push({ name: ctor.name, from });
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
