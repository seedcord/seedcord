import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { interactionRoutesOf, routeDecoratorOf } from '#decorators/interactionRoutes';
import { InteractionKind } from '#src/metadataKeys';

import { routeIdOf } from './routeIdOf';

import type { RoutableConstructor } from '#decorators/interactionRoutes';
import type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
import type { Logger } from '@seedcord/logger';

export interface RegisteredRoute<Ctor> {
    readonly kind: InteractionKind;
    readonly route: string;
    readonly fallback: boolean;
    readonly ctor: Ctor;
}

type KindMaps<Entry> = Readonly<Record<InteractionKind, Map<string, Entry>>>;

export type RouteMaps<Ctor> = KindMaps<RegisteredRoute<Ctor>>;

export function emptyRouteMaps<Entry>(): KindMaps<Entry> {
    return {
        [InteractionKind.Slash]: new Map(),
        [InteractionKind.UserContextMenu]: new Map(),
        [InteractionKind.MessageContextMenu]: new Map(),
        [InteractionKind.Autocomplete]: new Map(),
        [InteractionKind.Button]: new Map(),
        [InteractionKind.StringMenu]: new Map(),
        [InteractionKind.UserMenu]: new Map(),
        [InteractionKind.RoleMenu]: new Map(),
        [InteractionKind.ChannelMenu]: new Map(),
        [InteractionKind.MentionableMenu]: new Map(),
        [InteractionKind.Modal]: new Map()
    };
}

export function matchRoute<Ctor>(
    maps: RouteMaps<Ctor>,
    kind: InteractionKind,
    route: string,
    unhandled: { readonly repliable: Ctor; readonly autocomplete: Ctor }
): RegisteredRoute<Ctor> {
    return (
        maps[kind].get(route) ?? {
            kind,
            route,
            fallback: true,
            ctor: kind === InteractionKind.Autocomplete ? unhandled.autocomplete : unhandled.repliable
        }
    );
}

interface LoadedRoute<Ctor> extends RegisteredRoute<Ctor> {
    readonly from: string;
}

export class RouteRegistry<Ctor extends RoutableConstructor> {
    public readonly maps: KindMaps<LoadedRoute<Ctor>> = emptyRouteMaps();

    private get allRoutes(): LoadedRoute<Ctor>[] {
        return Object.values(this.maps).flatMap((routes) => [...routes.values()]);
    }

    public get size(): number {
        return this.allRoutes.length;
    }

    // returns whether the class declared any route
    public register(ctor: Ctor, from: string): boolean {
        // a partial registration would orphan routes and break hmr rollback
        const writes: LoadedRoute<Ctor>[] = [];

        for (const [kind, routes] of interactionRoutesOf(ctor)) {
            for (const route of routes) {
                const existing = this.maps[kind].get(route);
                if (existing && existing.ctor !== ctor) {
                    throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                        'route',
                        routeIdOf(kind, route),
                        [
                            `${paint.bold(existing.ctor.name)} (${paint.path(existing.from)})`,
                            `${paint.bold(ctor.name)} (${paint.path(from)})`
                        ]
                    ]);
                }
                writes.push({ kind, route, fallback: false, ctor, from });
            }
        }

        for (const write of writes) this.maps[write.kind].set(write.route, write);
        return writes.length > 0;
    }

    public unregister(ctor: Ctor): void {
        for (const { kind, route } of this.allRoutes) {
            if (this.maps[kind].get(route)?.ctor === ctor) this.maps[kind].delete(route);
        }
    }

    public warnUnhandledRoutes(logger: Logger, leaves: Iterable<string>): void {
        this.warnMissing(logger, leaves, InteractionKind.Slash, 'Slash route');
    }

    public warnUnhandledContextMenuRoutes(logger: Logger, leaves: ContextMenuLeaves): void {
        this.warnMissing(logger, leaves.user, InteractionKind.UserContextMenu, 'User context menu');
        this.warnMissing(logger, leaves.message, InteractionKind.MessageContextMenu, 'Message context menu');
    }

    private warnMissing(logger: Logger, names: Iterable<string>, kind: InteractionKind, label: string): void {
        const decorator = paint.bold(routeDecoratorOf(kind));
        for (const name of names) {
            if (this.maps[kind].has(name)) continue;
            logger.warn(`${label} ${paint.sky.bold(name)} doesn't have a registered ${decorator} handler.`);
        }
    }
}
