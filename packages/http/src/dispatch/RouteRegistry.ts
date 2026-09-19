import { interactionRoutesOf } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { emptyRouteMaps } from './resolve';

import type { HandlerConstructor } from '#handlers/constructors';
import type { RouteMaps } from './resolve';
import type { InteractionKind } from '@seedcord/core';

interface Owner {
    readonly ctor: HandlerConstructor;
    readonly kind: InteractionKind;
    readonly key: string;
    readonly from: string;
}

// the node walk and the edge manifest both register through this
export class RouteRegistry {
    public readonly maps: RouteMaps = emptyRouteMaps();

    private readonly owners = new Map<string, Owner>();

    public get size(): number {
        return this.owners.size;
    }

    /**
     * Writes every route the class declares. A class declaring none returns false.
     *
     * @throws A **SeedcordError** when another class already holds one of them.
     */
    public register(ctor: HandlerConstructor, from: string): boolean {
        // nothing is written until every route clears the check below
        const writes: { kind: InteractionKind; key: string }[] = [];

        for (const [kind, keys] of interactionRoutesOf(ctor)) {
            for (const key of keys) {
                const existing = this.owners.get(`${kind}:${key}`);
                if (existing && existing.ctor !== ctor) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                        `${kind}:${key}`,
                        `${existing.ctor.name} (${existing.from})`,
                        `${ctor.name} (${from})`
                    ]);
                }
                writes.push({ kind, key });
            }
        }

        if (writes.length === 0) return false;

        for (const { kind, key } of writes) {
            const routeId = `${kind}:${key}`;
            this.maps[kind].set(key, { kind, routeId, ctor });
            this.owners.set(routeId, { ctor, kind, key, from });
        }
        return true;
    }

    public unregister(ctor: HandlerConstructor, routeIds?: readonly string[]): void {
        for (const routeId of routeIds ?? this.routesOf(ctor)) {
            const owner = this.owners.get(routeId);
            if (owner?.ctor !== ctor) continue;
            this.owners.delete(routeId);
            this.maps[owner.kind].delete(owner.key);
        }
    }

    public routesOf(ctor: HandlerConstructor): string[] {
        const routeIds: string[] = [];
        for (const [routeId, owner] of this.owners) {
            if (owner.ctor === ctor) routeIds.push(routeId);
        }
        return routeIds;
    }
}
