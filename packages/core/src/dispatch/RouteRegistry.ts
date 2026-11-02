import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { interactionRoutesOf } from '#decorators/interactionRoutes';
import { InteractionKind } from '#src/metadataKeys';

import { routeIdOf } from './routeIdOf';

import type { RoutableConstructor } from '#decorators/interactionRoutes';

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

interface Owner<Ctor> {
    readonly ctor: Ctor;
    readonly kind: InteractionKind;
    readonly key: string;
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
        const writes: { kind: InteractionKind; key: string; routeId: string }[] = [];

        for (const [kind, keys] of interactionRoutesOf(ctor)) {
            for (const key of keys) {
                const routeId = routeIdOf(kind, key);
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
                writes.push({ kind, key, routeId });
            }
        }

        if (writes.length === 0) return false;

        for (const { kind, key, routeId } of writes) {
            this.maps[kind].set(key, { kind, route: key, fallback: false, ctor });
            this.owners.set(routeId, { ctor, kind, key, from });
        }
        return true;
    }

    public unregister(ctor: Ctor, routeIds?: readonly string[]): void {
        for (const routeId of routeIds ?? this.routesOf(ctor)) {
            const owner = this.owners.get(routeId);
            if (owner?.ctor !== ctor) continue;
            this.owners.delete(routeId);
            this.maps[owner.kind].delete(owner.key);
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
