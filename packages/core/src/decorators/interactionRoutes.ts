import 'reflect-metadata';

import { ApplicationCommandType } from 'discord-api-types/v10';

import { ComponentDefsKey } from '#customId/routing';
import { InteractionMetadataKey, InteractionRouteKeys, InteractionKind } from '#src/metadataKeys';

import type { ContextMenuKind } from '#registries/ContextMenuRegistry';
import type { AnyCustomId } from '@seedcord/custom-id';

// loose on purpose, each transport's typed decorators pass their asserted ctors straight in
export type RoutableConstructor = new (...args: never[]) => unknown;

export function areRoutes(routes: unknown): routes is string[] {
    return Array.isArray(routes) && routes.every((route) => typeof route === 'string');
}

// the build's manifest emitter reads the same pairs
export function interactionRoutesOf(constructor: RoutableConstructor): [InteractionKind, string[]][] {
    const pairs: [InteractionKind, string[]][] = [];
    for (const route of Object.values(InteractionKind)) {
        const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[route], constructor);
        if (areRoutes(meta)) pairs.push([route, meta]);
    }
    return pairs;
}

export function storeInteractionRoute(
    route: InteractionKind,
    routes: string | readonly string[],
    constructor: RoutableConstructor
): void {
    const key = InteractionRouteKeys[route];
    const saved: unknown = Reflect.getMetadata(key, constructor);
    const existing = areRoutes(saved) ? saved : [];
    const toStore = typeof routes === 'string' ? [routes] : routes;
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
        constructor
    );
    Reflect.defineMetadata(ComponentDefsKey, defs, constructor);
}

export function contextMenuRouteOf(kind: ContextMenuKind): InteractionKind {
    return kind === ApplicationCommandType.User ? InteractionKind.UserContextMenu : InteractionKind.MessageContextMenu;
}
