import { CustomId, InteractionKind } from '@seedcord/core';
import { RouteRegistry, storeInteractionRoute } from '@seedcord/core/internal';
import { describe, expect, it } from 'vite-plus/test';

import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';
import { resolve, routesOf } from '#src/dispatch/resolve';

import { FROM } from './harness';

import type { HandlerConstructor, HandlerSlots } from '#handlers/constructors';
import type { Routes } from '#src/dispatch/resolve';
import type { APIInteraction } from 'discord-api-types/v10';

type Registration = [kind: InteractionKind, key: string, className?: string];

function handlerNamed(name: string): HandlerConstructor {
    const ctor = class extends UnhandledRepliable {};
    Object.defineProperty(ctor, 'name', { value: name });
    return ctor;
}

function routesWith(...registrations: Registration[]): Routes {
    const registry = new RouteRegistry<HandlerSlots>();
    for (const [kind, key, className] of registrations) {
        const ctor = handlerNamed(className ?? `${key}:${kind}`);
        storeInteractionRoute(kind, key, ctor);
        registry.register(ctor, FROM);
    }
    return routesOf(registry.maps);
}

// justified: resolve reads only type and data off the payload
const slash = (name: string, options?: unknown[]): APIInteraction =>
    ({ type: 2, data: { type: 1, name, ...(options && { options }) } }) as unknown as APIInteraction;

// justified: resolve reads only type and data off the payload
const component = (componentType: number, customId: string): APIInteraction =>
    ({ type: 3, data: { component_type: componentType, custom_id: customId } }) as unknown as APIInteraction;

describe('resolve', () => {
    it('resolves a slash command by name with the slash route id', () => {
        const routes = routesWith([InteractionKind.Slash, 'ban', 'Ban']);

        const match = resolve(routes, slash('ban'));

        expect(match).toMatchObject({ kind: 'slash', route: 'ban', fallback: false });
        expect(match?.ctor.name).toBe('Ban');
    });

    it('resolves the unhandled default for a command name nothing registered', () => {
        const routes = routesWith([InteractionKind.Slash, 'ban', 'Ban']);

        expect(resolve(routes, slash('kick'))).toMatchObject({ kind: 'slash', route: 'kick', fallback: true });
    });

    it('resolves a subcommand to its full route path', () => {
        const routes = routesWith([InteractionKind.Slash, 'config/set']);

        const match = resolve(routes, slash('config', [{ type: 1, name: 'set' }]));

        expect(match?.route).toBe('config/set');
    });

    it('resolves a grouped subcommand to its command/group/subcommand path', () => {
        const routes = routesWith([InteractionKind.Slash, 'config/perms/set']);

        const match = resolve(
            routes,
            slash('config', [{ type: 2, name: 'perms', options: [{ type: 1, name: 'set' }] }])
        );

        expect(match?.route).toBe('config/perms/set');
    });

    it('resolves context menus by name per kind, so a user and a message command can share a name', () => {
        const routes = routesWith(
            [InteractionKind.UserContextMenu, 'Report', 'ReportUser'],
            [InteractionKind.MessageContextMenu, 'Report', 'ReportMessage']
        );

        // justified: resolve reads only type and data off the payload
        const userMatch = resolve(routes, { type: 2, data: { type: 2, name: 'Report' } } as unknown as APIInteraction);
        const messageMatch = resolve(routes, {
            type: 2,
            data: { type: 3, name: 'Report' }
        } as unknown as APIInteraction);

        expect(userMatch).toMatchObject({ kind: 'userContextMenu', route: 'Report', fallback: false });
        expect(userMatch?.ctor.name).toBe('ReportUser');
        expect(messageMatch).toMatchObject({ kind: 'messageContextMenu', route: 'Report', fallback: false });
        expect(messageMatch?.ctor.name).toBe('ReportMessage');
    });

    it('resolves autocomplete through its own map, separate from the slash handler', () => {
        const routes = routesWith(
            [InteractionKind.Slash, 'search', 'Search'],
            [InteractionKind.Autocomplete, 'search', 'SearchAutocomplete']
        );

        // justified: resolve reads only type and data off the payload
        const match = resolve(routes, { type: 4, data: { type: 1, name: 'search' } } as unknown as APIInteraction);

        expect(match).toMatchObject({ kind: 'autocomplete', route: 'search', fallback: false });
        expect(match?.ctor.name).toBe('SearchAutocomplete');
    });

    it('resolves a button by the stable prefix of its minted wire', () => {
        const approve = new CustomId('approve').snowflake('userId');
        const routes = routesWith([InteractionKind.Button, 'approve']);

        const match = resolve(routes, component(2, approve.encode({ userId: '123' })));

        expect(match).toMatchObject({ kind: 'button', route: 'approve', fallback: false });
    });

    it('routes a wire whose layout hash drifted to the same prefix, the handler decode validates later', () => {
        const drifted = new CustomId('approve').snowflake('userId').bool('force');
        const routes = routesWith([InteractionKind.Button, 'approve']);

        const match = resolve(routes, component(2, drifted.encode({ userId: '123', force: true })));

        expect(match?.route).toBe('approve');
    });

    it('keys each select kind into its own map with the core route id naming', () => {
        const feed = new CustomId('feed').snowflake('channelId');
        const routes = routesWith([InteractionKind.StringMenu, 'feed'], [InteractionKind.ChannelMenu, 'feed']);
        const wire = feed.encode({ channelId: '5' });

        expect(resolve(routes, component(3, wire))).toMatchObject({ route: 'feed', fallback: false });
        expect(resolve(routes, component(8, wire))).toMatchObject({ route: 'feed', fallback: false });
        expect(resolve(routes, component(5, wire))).toMatchObject({
            kind: 'userMenu',
            route: 'feed',
            fallback: true
        });
    });

    it('keys the user, role, and mentionable select kinds', () => {
        const pick = new CustomId('pick').snowflake('guildId');
        const routes = routesWith(
            [InteractionKind.UserMenu, 'pick'],
            [InteractionKind.RoleMenu, 'pick'],
            [InteractionKind.MentionableMenu, 'pick']
        );
        const wire = pick.encode({ guildId: '9' });

        expect(resolve(routes, component(5, wire))).toMatchObject({ route: 'pick', fallback: false });
        expect(resolve(routes, component(6, wire))).toMatchObject({ route: 'pick', fallback: false });
        expect(resolve(routes, component(7, wire))).toMatchObject({ route: 'pick', fallback: false });
    });

    it('resolves null for an unrecognized component type', () => {
        const routes = routesWith([InteractionKind.Button, 'approve']);

        expect(resolve(routes, component(99, 'approve:1'))).toBeNull();
    });

    it('resolves a modal submit by prefix through the modal map', () => {
        const config = new CustomId('cfg').str('section');
        const routes = routesWith([InteractionKind.Modal, 'cfg']);
        // justified: resolve reads only type and data off the payload
        const payload = {
            type: 5,
            data: { custom_id: config.encode({ section: 'general' }) }
        } as unknown as APIInteraction;

        expect(resolve(routes, payload)).toMatchObject({ kind: 'modal', route: 'cfg', fallback: false });
    });

    it('resolves the unhandled default for a wire no prefix owns', () => {
        const routes = routesWith([InteractionKind.Button, 'approve']);

        // prefixOf reads an empty key out of a wire without a colon
        expect(resolve(routes, component(2, 'other-app-id'))).toMatchObject({
            kind: 'button',
            route: '',
            fallback: true
        });
    });
});
