import { CustomId, InteractionKind } from '@seedcord/core';
import { storeInteractionRoute } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';
import { resolve } from '#src/dispatch/resolve';
import { RouteRegistry } from '#src/dispatch/RouteRegistry';

import { FROM } from './harness';

import type { HandlerConstructor } from '#handlers/constructors';
import type { RouteMaps } from '#src/dispatch/resolve';
import type { APIInteraction } from 'discord-api-types/v10';

type Registration = [kind: InteractionKind, key: string, className?: string];

function handlerNamed(name: string): HandlerConstructor {
    const ctor = class extends UnhandledRepliable {};
    Object.defineProperty(ctor, 'name', { value: name });
    return ctor;
}

function mapsWith(...registrations: Registration[]): RouteMaps {
    const registry = new RouteRegistry();
    for (const [kind, key, className] of registrations) {
        const ctor = handlerNamed(className ?? `${key}:${kind}`);
        storeInteractionRoute(kind, key, ctor);
        registry.register(ctor, FROM);
    }
    return registry.maps;
}

// justified: resolve reads only type and data off the payload
const slash = (name: string, options?: unknown[]): APIInteraction =>
    ({ type: 2, data: { type: 1, name, ...(options && { options }) } }) as unknown as APIInteraction;

// justified: resolve reads only type and data off the payload
const component = (componentType: number, customId: string): APIInteraction =>
    ({ type: 3, data: { component_type: componentType, custom_id: customId } }) as unknown as APIInteraction;

describe('resolve', () => {
    it('resolves a slash command by name with the slash route id', () => {
        const maps = mapsWith([InteractionKind.Slash, 'ban', 'Ban']);

        const match = resolve(maps, slash('ban'));

        expect(match).toMatchObject({ kind: 'slash', routeId: 'slash:ban' });
        expect(match?.ctor.name).toBe('Ban');
    });

    it('resolves the unhandled default for a command name nothing registered', () => {
        const maps = mapsWith([InteractionKind.Slash, 'ban', 'Ban']);

        expect(resolve(maps, slash('kick'))).toMatchObject({ kind: 'slash', routeId: null, attemptedKey: 'kick' });
    });

    it('resolves a subcommand to its full route path', () => {
        const maps = mapsWith([InteractionKind.Slash, 'config/set']);

        const match = resolve(maps, slash('config', [{ type: 1, name: 'set' }]));

        expect(match?.routeId).toBe('slash:config/set');
    });

    it('resolves a grouped subcommand to its command/group/subcommand path', () => {
        const maps = mapsWith([InteractionKind.Slash, 'config/perms/set']);

        const match = resolve(maps, slash('config', [{ type: 2, name: 'perms', options: [{ type: 1, name: 'set' }] }]));

        expect(match?.routeId).toBe('slash:config/perms/set');
    });

    it('resolves context menus by name per kind, so a user and a message command can share a name', () => {
        const maps = mapsWith(
            [InteractionKind.UserContextMenu, 'Report', 'ReportUser'],
            [InteractionKind.MessageContextMenu, 'Report', 'ReportMessage']
        );

        // justified: resolve reads only type and data off the payload
        const userMatch = resolve(maps, { type: 2, data: { type: 2, name: 'Report' } } as unknown as APIInteraction);
        const messageMatch = resolve(maps, { type: 2, data: { type: 3, name: 'Report' } } as unknown as APIInteraction);

        expect(userMatch).toMatchObject({ kind: 'userContextMenu', routeId: 'userContextMenu:Report' });
        expect(userMatch?.ctor.name).toBe('ReportUser');
        expect(messageMatch).toMatchObject({ kind: 'messageContextMenu', routeId: 'messageContextMenu:Report' });
        expect(messageMatch?.ctor.name).toBe('ReportMessage');
    });

    it('resolves autocomplete through its own map, separate from the slash handler', () => {
        const maps = mapsWith(
            [InteractionKind.Slash, 'search', 'Search'],
            [InteractionKind.Autocomplete, 'search', 'SearchAutocomplete']
        );

        // justified: resolve reads only type and data off the payload
        const match = resolve(maps, { type: 4, data: { type: 1, name: 'search' } } as unknown as APIInteraction);

        expect(match).toMatchObject({ kind: 'autocomplete', routeId: 'autocomplete:search' });
        expect(match?.ctor.name).toBe('SearchAutocomplete');
    });

    it('resolves a button by the stable prefix of its minted wire', () => {
        const approve = new CustomId('approve').snowflake('userId');
        const maps = mapsWith([InteractionKind.Button, 'approve']);

        const match = resolve(maps, component(2, approve.encode({ userId: '123' })));

        expect(match).toMatchObject({ kind: 'button', routeId: 'button:approve' });
    });

    it('routes a wire whose layout hash drifted to the same prefix, the handler decode validates later', () => {
        const drifted = new CustomId('approve').snowflake('userId').bool('force');
        const maps = mapsWith([InteractionKind.Button, 'approve']);

        const match = resolve(maps, component(2, drifted.encode({ userId: '123', force: true })));

        expect(match?.routeId).toBe('button:approve');
    });

    it('keys each select kind into its own map with the core route id naming', () => {
        const feed = new CustomId('feed').snowflake('channelId');
        const maps = mapsWith([InteractionKind.StringMenu, 'feed'], [InteractionKind.ChannelMenu, 'feed']);
        const wire = feed.encode({ channelId: '5' });

        expect(resolve(maps, component(3, wire))).toMatchObject({ routeId: 'stringMenu:feed' });
        expect(resolve(maps, component(8, wire))).toMatchObject({ routeId: 'channelMenu:feed' });
        expect(resolve(maps, component(5, wire))).toMatchObject({
            kind: 'userMenu',
            routeId: null,
            attemptedKey: 'feed'
        });
    });

    it('keys the user, role, and mentionable select kinds', () => {
        const pick = new CustomId('pick').snowflake('guildId');
        const maps = mapsWith(
            [InteractionKind.UserMenu, 'pick'],
            [InteractionKind.RoleMenu, 'pick'],
            [InteractionKind.MentionableMenu, 'pick']
        );
        const wire = pick.encode({ guildId: '9' });

        expect(resolve(maps, component(5, wire))).toMatchObject({ routeId: 'userMenu:pick' });
        expect(resolve(maps, component(6, wire))).toMatchObject({ routeId: 'roleMenu:pick' });
        expect(resolve(maps, component(7, wire))).toMatchObject({ routeId: 'mentionableMenu:pick' });
    });

    it('resolves null for an unrecognized component type', () => {
        const maps = mapsWith([InteractionKind.Button, 'approve']);

        expect(resolve(maps, component(99, 'approve:1'))).toBeNull();
    });

    it('resolves a modal submit by prefix through the modal map', () => {
        const config = new CustomId('cfg').str('section');
        const maps = mapsWith([InteractionKind.Modal, 'cfg']);
        // justified: resolve reads only type and data off the payload
        const payload = {
            type: 5,
            data: { custom_id: config.encode({ section: 'general' }) }
        } as unknown as APIInteraction;

        expect(resolve(maps, payload)).toMatchObject({ kind: 'modal', routeId: 'modal:cfg' });
    });

    it('resolves the unhandled default for a wire no prefix owns', () => {
        const maps = mapsWith([InteractionKind.Button, 'approve']);

        // prefixOf reads an empty key out of a wire with no colon
        expect(resolve(maps, component(2, 'other-app-id'))).toMatchObject({
            kind: 'button',
            routeId: null,
            attemptedKey: ''
        });
    });
});
