import 'reflect-metadata';

import { isStringArray } from '@seedcord/utils/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { ComponentDefsKey } from '#customId/routing';
import { assertUniqueKeys } from '#src/decorators/assertUniqueKeys';
import { InteractionMetadataKey, InteractionRouteKeys, InteractionKind } from '#src/metadataKeys';

import type { ContextMenuKind } from '#registries/ContextMenuRegistry';
import type { AnyCustomId } from '@seedcord/custom-id';

// loose on purpose, each transport's typed decorators pass their asserted ctors straight in
export type RoutableConstructor = new (...args: never[]) => unknown;

// the build's manifest emitter reads the same pairs
export function interactionRoutesOf(constructor: RoutableConstructor): [InteractionKind, string[]][] {
    const pairs: [InteractionKind, string[]][] = [];
    for (const route of Object.values(InteractionKind)) {
        const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[route], constructor);
        if (isStringArray(meta)) pairs.push([route, meta]);
    }
    return pairs;
}

export function routeDecoratorOf(kind: InteractionKind): string {
    return `@${kind.charAt(0).toUpperCase()}${kind.slice(1)}Route`;
}

export function storeInteractionRoute(
    route: InteractionKind,
    routes: string | readonly string[],
    constructor: RoutableConstructor,
    fix = 'Remove the repeat.'
): void {
    const key = InteractionRouteKeys[route];
    const saved: unknown = Reflect.getMetadata(key, constructor);
    const existing = isStringArray(saved) ? saved : [];
    const toStore = typeof routes === 'string' ? [routes] : routes;
    // own metadata, since a subclass can list a route that its parent lists
    const own: unknown = Reflect.getOwnMetadata(key, constructor);
    assertUniqueKeys(routeDecoratorOf(route), constructor, [...(isStringArray(own) ? own : []), ...toStore], fix);
    Reflect.defineMetadata(key, [...existing, ...toStore], constructor);
    Reflect.defineMetadata(InteractionMetadataKey, true, constructor);
}

export function storeComponentRoute(
    route: InteractionKind,
    defs: readonly AnyCustomId[],
    constructor: RoutableConstructor
): void {
    storeInteractionRoute(
        route,
        defs.map((def) => def.prefix),
        constructor,
        'Remove the repeat, or give each customId its own prefix.'
    );
    Reflect.defineMetadata(ComponentDefsKey, defs, constructor);
}

export function contextMenuRouteOf(kind: ContextMenuKind): InteractionKind {
    return kind === ApplicationCommandType.User ? InteractionKind.UserContextMenu : InteractionKind.MessageContextMenu;
}
