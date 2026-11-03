import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { interactionRoutesOf } from '#decorators/interactionRoutes';
import { InteractionKind } from '#src/metadataKeys';

import { routeIdOf } from './routeIdOf';

import type { RoutableConstructor } from '#decorators/interactionRoutes';
import type { Logger } from '@seedcord/logger';

export interface RegisteredRoute<Ctor> {
    readonly kind: InteractionKind;
    readonly route: string;
    readonly fallback: boolean;
    readonly ctor: Ctor;
}

export type RouteMaps<Ctor> = Readonly<Record<InteractionKind, Map<string, RegisteredRoute<Ctor>>>>;

export function emptyRouteMaps<Ctor>(): RouteMaps<Ctor> {
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

interface Owner<Ctor> extends RegisteredRoute<Ctor> {
    readonly from: string;
}

export class RouteRegistry<Ctor extends RoutableConstructor> {
    public readonly maps: RouteMaps<Ctor> = emptyRouteMaps();

    private readonly owners = new Map<string, Owner<Ctor>>();

    public get size(): number {
        return this.owners.size;
    }

    // returns whether the class declared any route
    public register(ctor: Ctor, from: string): boolean {
        // nothing is written until every route clears the check below
        const writes: { routeId: string; owner: Owner<Ctor> }[] = [];

        for (const [kind, routes] of interactionRoutesOf(ctor)) {
            for (const route of routes) {
                const routeId = routeIdOf(kind, route);
                const existing = this.owners.get(routeId);
                if (existing && existing.ctor !== ctor) {
                    throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                        'route',
                        routeId,
                        [
                            `${paint.bold(existing.ctor.name)} (${paint.path(existing.from)})`,
                            `${paint.bold(ctor.name)} (${paint.path(from)})`
                        ]
                    ]);
                }
                writes.push({ routeId, owner: { kind, route, fallback: false, ctor, from } });
            }
        }

        if (writes.length === 0) return false;

        for (const { routeId, owner } of writes) {
            this.maps[owner.kind].set(owner.route, owner);
            this.owners.set(routeId, owner);
        }
        return true;
    }

    public unregister(ctor: Ctor, routeIds?: readonly string[]): void {
        for (const routeId of routeIds ?? this.routesOf(ctor)) {
            const owner = this.owners.get(routeId);
            if (owner?.ctor !== ctor) continue;
            this.owners.delete(routeId);
            this.maps[owner.kind].delete(owner.route);
        }
    }

    public warnMissing(
        logger: Logger,
        names: Iterable<string>,
        kind: InteractionKind,
        label: string,
        decorator: string
    ): void {
        for (const name of names) {
            if (this.maps[kind].has(name)) continue;
            logger.warn(`${label} ${paint.sky.bold(name)} doesn't have a registered ${paint.bold(decorator)} handler.`);
        }
    }

    public routesOf(ctor: Ctor): string[] {
        const routeIds: string[] = [];
        for (const [routeId, owner] of this.owners) {
            if (owner.ctor === ctor) routeIds.push(routeId);
        }
        return routeIds;
    }
}
