import 'reflect-metadata';

import { ApplicationCommandType } from 'discord-api-types/v10';

import { ComponentDefsKey } from '@customId/routing';
import { InteractionMetadataKey, InteractionRouteKeys, InteractionRoutes } from '@src/metadataKeys';

import type { AnyCustomId } from '@customId/CustomId';
import type { ContextMenuKind } from '@registries/ContextMenuRegistry';

/** The select menu kinds the select route decorators take. */
export enum SelectMenuKind {
    String = 'string',
    User = 'user',
    Role = 'role',
    Channel = 'channel',
    Mentionable = 'mentionable'
}

// loose on purpose, each transport's typed decorators pass their asserted ctors straight in
export type RoutableConstructor = new (...args: never[]) => unknown;

export function areRoutes(routes: unknown): routes is string[] {
    return Array.isArray(routes) && routes.every((route) => typeof route === 'string');
}

/**
 * Every stored route kind and its route strings on a decorated constructor. The build's manifest
 * emitter reads the same pairs.
 */
export function interactionRoutesOf(constructor: RoutableConstructor): [InteractionRoutes, string[]][] {
    const pairs: [InteractionRoutes, string[]][] = [];
    for (const route of Object.values(InteractionRoutes)) {
        const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[route], constructor);
        if (areRoutes(meta)) pairs.push([route, meta]);
    }
    return pairs;
}

export function storeInteractionRoute(
    route: InteractionRoutes,
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

// each definition's stable prefix is the routing key, the full defs stay on the ctor for decoding
export function storeComponentRoute(
    route: InteractionRoutes,
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

const SELECT_ROUTES: Record<SelectMenuKind, InteractionRoutes> = {
    [SelectMenuKind.String]: InteractionRoutes.StringMenu,
    [SelectMenuKind.User]: InteractionRoutes.UserMenu,
    [SelectMenuKind.Role]: InteractionRoutes.RoleMenu,
    [SelectMenuKind.Channel]: InteractionRoutes.ChannelMenu,
    [SelectMenuKind.Mentionable]: InteractionRoutes.MentionableMenu
};

export function selectMenuRouteOf(kind: SelectMenuKind): InteractionRoutes {
    return SELECT_ROUTES[kind];
}

export function contextMenuRouteOf(kind: ContextMenuKind): InteractionRoutes {
    return kind === ApplicationCommandType.User
        ? InteractionRoutes.UserContextMenu
        : InteractionRoutes.MessageContextMenu;
}
