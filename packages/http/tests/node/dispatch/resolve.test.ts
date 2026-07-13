import { CustomId } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { buildRouteMaps, resolve } from '@src/dispatch/resolve';

import type { ComponentRoute, RouteManifest } from '@src/manifest/RouteManifest';
import type { APIInteraction } from 'discord-api-types/v10';

const noop = (): Promise<unknown> => Promise.resolve({});

function manifestWith(partial: Partial<RouteManifest>): RouteManifest {
    return { commands: [], components: [], autocomplete: [], subscribers: [], ...partial };
}

// justified: resolve reads only type and data off the payload
const slash = (name: string, options?: unknown[]): APIInteraction =>
    ({ type: 2, data: { type: 1, name, ...(options && { options }) } }) as unknown as APIInteraction;

describe('resolve', () => {
    it('resolves a slash command by name with the slash route id', async () => {
        const load = noop;
        const maps = buildRouteMaps(manifestWith({ commands: [{ name: 'ban', type: 1, load }] }));

        const match = await resolve(maps, slash('ban'));

        expect(match).toMatchObject({ kind: 'slash', routeId: 'slash:ban' });
        expect(match?.load).toBe(load);
    });

    it('resolves null for a command name with no row', async () => {
        const maps = buildRouteMaps(manifestWith({ commands: [{ name: 'ban', type: 1, load: noop }] }));

        await expect(resolve(maps, slash('kick'))).resolves.toBeNull();
    });

    it('resolves a subcommand to its full route path', async () => {
        const maps = buildRouteMaps(manifestWith({ commands: [{ name: 'config/set', type: 1, load: noop }] }));

        const match = await resolve(maps, slash('config', [{ type: 1, name: 'set' }]));

        expect(match?.routeId).toBe('slash:config/set');
    });

    it('resolves context menus by name per kind, so a user and a message command can share a name', async () => {
        const userLoad = noop;
        const messageLoad = (): Promise<unknown> => Promise.resolve({ different: true });
        const maps = buildRouteMaps(
            manifestWith({
                commands: [
                    { name: 'Report', type: 2, load: userLoad },
                    { name: 'Report', type: 3, load: messageLoad }
                ]
            })
        );

        // justified: resolve reads only type and data off the payload
        const userMatch = await resolve(maps, {
            type: 2,
            data: { type: 2, name: 'Report' }
        } as unknown as APIInteraction);
        const messageMatch = await resolve(maps, {
            type: 2,
            data: { type: 3, name: 'Report' }
        } as unknown as APIInteraction);

        expect(userMatch).toMatchObject({ kind: 'userContextMenu', routeId: 'userContextMenu:Report' });
        expect(userMatch?.load).toBe(userLoad);
        expect(messageMatch).toMatchObject({ kind: 'messageContextMenu', routeId: 'messageContextMenu:Report' });
        expect(messageMatch?.load).toBe(messageLoad);
    });

    it('resolves autocomplete by command route through its own map, separate from the slash row', async () => {
        const autocompleteLoad = noop;
        const maps = buildRouteMaps(
            manifestWith({
                commands: [{ name: 'search', type: 1, load: noop }],
                autocomplete: [{ name: 'search', load: autocompleteLoad }]
            })
        );

        // justified: resolve reads only type and data off the payload
        const match = await resolve(maps, { type: 4, data: { type: 1, name: 'search' } } as unknown as APIInteraction);

        expect(match).toMatchObject({ kind: 'autocomplete', routeId: 'autocomplete:search' });
        expect(match?.load).toBe(autocompleteLoad);
    });

    it('resolves a grouped subcommand to its command/group/subcommand path', async () => {
        const maps = buildRouteMaps(manifestWith({ commands: [{ name: 'config/perms/set', type: 1, load: noop }] }));

        const match = await resolve(
            maps,
            slash('config', [{ type: 2, name: 'perms', options: [{ type: 1, name: 'set' }] }])
        );

        expect(match?.routeId).toBe('slash:config/perms/set');
    });

    // justified: resolve reads only type and data off the payload
    const component = (componentType: number, customId: string): APIInteraction =>
        ({ type: 3, data: { component_type: componentType, custom_id: customId } }) as unknown as APIInteraction;

    const componentRow = (kind: ComponentRoute['kind'], prefix: string): ComponentRoute => ({
        kind,
        prefix,
        load: noop
    });

    it('resolves a button by the stable prefix of its minted wire', async () => {
        const approve = new CustomId('approve').snowflake('userId');
        const maps = buildRouteMaps(manifestWith({ components: [componentRow('button', 'approve')] }));

        const match = await resolve(maps, component(2, approve.encode({ userId: '123' })));

        expect(match).toMatchObject({ kind: 'button', routeId: 'button:approve' });
    });

    it('routes a wire whose layout hash drifted to the same prefix, the handler decode validates later', async () => {
        const drifted = new CustomId('approve').snowflake('userId').bool('force');
        const maps = buildRouteMaps(manifestWith({ components: [componentRow('button', 'approve')] }));

        const match = await resolve(maps, component(2, drifted.encode({ userId: '123', force: true })));

        expect(match?.routeId).toBe('button:approve');
    });

    it('keys each select kind into its own map with the core route id naming', async () => {
        const feed = new CustomId('feed').snowflake('channelId');
        const maps = buildRouteMaps(
            manifestWith({
                components: [componentRow('stringSelect', 'feed'), componentRow('channelSelect', 'feed')]
            })
        );
        const wire = feed.encode({ channelId: '5' });

        await expect(resolve(maps, component(3, wire))).resolves.toMatchObject({ routeId: 'stringMenu:feed' });
        await expect(resolve(maps, component(8, wire))).resolves.toMatchObject({ routeId: 'channelMenu:feed' });
        await expect(resolve(maps, component(5, wire))).resolves.toBeNull();
    });

    it('keys the user, role, and mentionable select kinds', async () => {
        const pick = new CustomId('pick').snowflake('guildId');
        const maps = buildRouteMaps(
            manifestWith({
                components: [
                    componentRow('userSelect', 'pick'),
                    componentRow('roleSelect', 'pick'),
                    componentRow('mentionableSelect', 'pick')
                ]
            })
        );
        const wire = pick.encode({ guildId: '9' });

        await expect(resolve(maps, component(5, wire))).resolves.toMatchObject({ routeId: 'userMenu:pick' });
        await expect(resolve(maps, component(6, wire))).resolves.toMatchObject({ routeId: 'roleMenu:pick' });
        await expect(resolve(maps, component(7, wire))).resolves.toMatchObject({ routeId: 'mentionableMenu:pick' });
    });

    it('resolves a modal submit by prefix through the modal map', async () => {
        const config = new CustomId('cfg').str('section');
        const maps = buildRouteMaps(manifestWith({ components: [componentRow('modal', 'cfg')] }));
        // justified: resolve reads only type and data off the payload
        const payload = {
            type: 5,
            data: { custom_id: config.encode({ section: 'general' }) }
        } as unknown as APIInteraction;

        await expect(resolve(maps, payload)).resolves.toMatchObject({ kind: 'modal', routeId: 'modal:cfg' });
    });

    it('resolves null for a foreign wire no prefix owns', async () => {
        const maps = buildRouteMaps(manifestWith({ components: [componentRow('button', 'approve')] }));

        await expect(resolve(maps, component(2, 'other-app-id'))).resolves.toBeNull();
    });
});
