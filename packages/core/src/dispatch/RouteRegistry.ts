import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { interactionRoutesOf, routeDecoratorOf } from '#decorators/interactionRoutes';
import { InteractionKind } from '#src/metadataKeys';

import { routeIdOf } from './routeIdOf';

import type { RoutableConstructor } from '#decorators/interactionRoutes';
import type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
import type { MiddlewareKind } from '#src/metadataKeys';
import type { Logger } from '@seedcord/logger';

export interface RegisteredRoute<Ctor, Kind extends InteractionKind = InteractionKind> {
    readonly kind: Kind;
    readonly route: string;
    readonly fallback: boolean;
    readonly ctor: Ctor;
}

// the handler class each kind takes. a transport types every slot with that kind's event
type HandlerSlots = Readonly<Record<InteractionKind, RoutableConstructor>>;

type KindMaps<Slots extends HandlerSlots, Extra extends object = object> = {
    readonly [Kind in InteractionKind]: Map<string, RegisteredRoute<Slots[Kind], Kind> & Extra>;
};

export type RouteMaps<Slots extends HandlerSlots> = KindMaps<Slots>;

// a matched route with the event that reached it. indexing by Kind keeps each class with its own kind's event
export type ResolvedRoute<
    Slots extends HandlerSlots,
    Events extends Record<InteractionKind, unknown>,
    Kind extends InteractionKind = InteractionKind
> = { [Each in Kind]: RegisteredRoute<Slots[Each], Each> & { readonly event: Events[Each] } }[Kind];

export function emptyRouteMaps<Slots extends HandlerSlots, Extra extends object = object>(): KindMaps<Slots, Extra> {
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

export function unhandledSlots<Repliable, Autocomplete>(
    repliable: Repliable,
    autocomplete: Autocomplete
): Record<MiddlewareKind, Repliable> & Record<InteractionKind.Autocomplete, Autocomplete> {
    return {
        [InteractionKind.Slash]: repliable,
        [InteractionKind.UserContextMenu]: repliable,
        [InteractionKind.MessageContextMenu]: repliable,
        [InteractionKind.Button]: repliable,
        [InteractionKind.StringMenu]: repliable,
        [InteractionKind.UserMenu]: repliable,
        [InteractionKind.RoleMenu]: repliable,
        [InteractionKind.ChannelMenu]: repliable,
        [InteractionKind.MentionableMenu]: repliable,
        [InteractionKind.Modal]: repliable,
        [InteractionKind.Autocomplete]: autocomplete
    };
}

export function matchRoute<Slots extends HandlerSlots, Kind extends InteractionKind>(
    maps: RouteMaps<Slots>,
    kind: Kind,
    route: string,
    unhandledByKind: Slots
): RegisteredRoute<Slots[Kind], Kind> {
    return maps[kind].get(route) ?? { kind, route, fallback: true, ctor: unhandledByKind[kind] };
}

interface Loaded {
    readonly from: string;
}

export class RouteRegistry<Slots extends HandlerSlots> {
    public readonly maps: KindMaps<Slots, Loaded> = emptyRouteMaps();

    private get allRoutes(): (RegisteredRoute<Slots[InteractionKind]> & Loaded)[] {
        return Object.values(this.maps).flatMap((routes) => [...routes.values()]);
    }

    // justified: a class only reaches a kind's map through that kind's route decorator, which type-checked it for the slot
    private routesOf<Kind extends InteractionKind>(kind: Kind): Map<string, RegisteredRoute<Slots[Kind]> & Loaded> {
        return this.maps[kind];
    }

    public get size(): number {
        return this.allRoutes.length;
    }

    // returns whether the class declared any route
    public register(ctor: Slots[InteractionKind], from: string): boolean {
        // a partial registration would orphan routes and break hmr rollback
        const writes: (RegisteredRoute<Slots[InteractionKind]> & Loaded)[] = [];

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

        for (const write of writes) this.routesOf(write.kind).set(write.route, write);
        return writes.length > 0;
    }

    public unregister(ctor: Slots[InteractionKind]): void {
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
