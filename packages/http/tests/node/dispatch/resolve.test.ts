import { CustomId } from '@seedcord/core';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { buildRouteMaps, resolve } from '@src/dispatch/resolve';

import { FROM } from './harness';

import type { ComponentRoute, RouteManifest, RouteModule } from '@src/manifest/RouteManifest';
import type { APIInteraction } from 'discord-api-types/v10';

// the module exports an object carrying its own name, so a test can assert which one the route resolved
function rowFor(exportName: string): RouteModule {
    const exported = { name: exportName };
    return { exportName, from: FROM, load: () => Promise.resolve({ [exportName]: exported }) };
}

function manifestWith(partial: Partial<RouteManifest>): RouteManifest {
    return {
        commandRoutes: [],
        componentRoutes: [],
        autocompleteRoutes: [],
        subscriberRoutes: [],
        middlewareRoutes: [],
        ...partial
    };
}

// justified: resolve reads only type and data off the payload
const slash = (name: string, options?: unknown[]): APIInteraction =>
    ({ type: 2, data: { type: 1, name, ...(options && { options }) } }) as unknown as APIInteraction;

describe('resolve', () => {
    it('resolves a slash command by name with the slash route id', async () => {
        const maps = buildRouteMaps(manifestWith({ commandRoutes: [{ name: 'ban', type: 1, ...rowFor('Ban') }] }));

        const match = resolve(maps, slash('ban'));

        expect(match).toMatchObject({ kind: 'slash', routeId: 'slash:ban' });
        await expect(match?.load()).resolves.toEqual({ name: 'Ban' });
    });

    it('translates a row whose module throws while importing, keeping the cause', async () => {
        const boom = new Error('module init exploded');
        const maps = buildRouteMaps(
            manifestWith({
                commandRoutes: [
                    { name: 'ban', type: 1, exportName: 'Ban', from: FROM, load: () => Promise.reject(boom) }
                ]
            })
        );

        const match = resolve(maps, slash('ban'));

        const caught: unknown = await match?.load().catch((error: unknown) => error);
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.RouteModuleLoadFailed)).toBe(true);
        expect((caught as Error).message).toContain(FROM);
        expect((caught as Error).cause).toBe(boom);
    });

    it('resolves the unhandled default for a command name with no row', () => {
        const maps = buildRouteMaps(manifestWith({ commandRoutes: [{ name: 'ban', type: 1, ...rowFor('Ban') }] }));

        expect(resolve(maps, slash('kick'))).toMatchObject({ kind: 'slash', routeId: null, attemptedKey: 'kick' });
    });

    it('resolves a subcommand to its full route path', () => {
        const maps = buildRouteMaps(
            manifestWith({ commandRoutes: [{ name: 'config/set', type: 1, ...rowFor('ConfigSet') }] })
        );

        const match = resolve(maps, slash('config', [{ type: 1, name: 'set' }]));

        expect(match?.routeId).toBe('slash:config/set');
    });

    it('resolves context menus by name per kind, so a user and a message command can share a name', async () => {
        const maps = buildRouteMaps(
            manifestWith({
                commandRoutes: [
                    { name: 'Report', type: 2, ...rowFor('ReportUser') },
                    { name: 'Report', type: 3, ...rowFor('ReportMessage') }
                ]
            })
        );

        // justified: resolve reads only type and data off the payload
        const userMatch = resolve(maps, {
            type: 2,
            data: { type: 2, name: 'Report' }
        } as unknown as APIInteraction);
        const messageMatch = resolve(maps, {
            type: 2,
            data: { type: 3, name: 'Report' }
        } as unknown as APIInteraction);

        expect(userMatch).toMatchObject({ kind: 'userContextMenu', routeId: 'userContextMenu:Report' });
        await expect(userMatch?.load()).resolves.toEqual({ name: 'ReportUser' });
        expect(messageMatch).toMatchObject({ kind: 'messageContextMenu', routeId: 'messageContextMenu:Report' });
        await expect(messageMatch?.load()).resolves.toEqual({ name: 'ReportMessage' });
    });

    it('resolves autocomplete by command route through its own map, separate from the slash row', async () => {
        const maps = buildRouteMaps(
            manifestWith({
                commandRoutes: [{ name: 'search', type: 1, ...rowFor('Search') }],
                autocompleteRoutes: [{ name: 'search', ...rowFor('SearchAutocomplete') }]
            })
        );

        // justified: resolve reads only type and data off the payload
        const match = resolve(maps, { type: 4, data: { type: 1, name: 'search' } } as unknown as APIInteraction);

        expect(match).toMatchObject({ kind: 'autocomplete', routeId: 'autocomplete:search' });
        await expect(match?.load()).resolves.toEqual({ name: 'SearchAutocomplete' });
    });

    it('resolves a grouped subcommand to its command/group/subcommand path', () => {
        const maps = buildRouteMaps(
            manifestWith({ commandRoutes: [{ name: 'config/perms/set', type: 1, ...rowFor('PermsSet') }] })
        );

        const match = resolve(maps, slash('config', [{ type: 2, name: 'perms', options: [{ type: 1, name: 'set' }] }]));

        expect(match?.routeId).toBe('slash:config/perms/set');
    });

    it('throws reporting both rows when two rows resolve to the same route', () => {
        const manifest = manifestWith({
            commandRoutes: [
                { name: 'ban', type: 1, ...rowFor('Ban') },
                { name: 'ban', type: 1, ...rowFor('BanAgain') }
            ]
        });

        expect(() => buildRouteMaps(manifest)).toThrow(/slash:ban.*Ban \(handlers\/Test\.ts\).*BanAgain/s);
    });

    it('throws reporting the route, the export, and the file when the module has no such export', async () => {
        const maps = buildRouteMaps(
            manifestWith({
                commandRoutes: [
                    { name: 'ban', type: 1, exportName: 'Ban', from: FROM, load: () => Promise.resolve({ Other: 1 }) }
                ]
            })
        );

        const match = resolve(maps, slash('ban'));

        await expect(match?.load()).rejects.toThrow(/slash:ban.*Ban.*handlers\/Test\.ts/s);
    });

    // justified: resolve reads only type and data off the payload
    const component = (componentType: number, customId: string): APIInteraction =>
        ({ type: 3, data: { component_type: componentType, custom_id: customId } }) as unknown as APIInteraction;

    const componentRow = (kind: ComponentRoute['kind'], prefix: string): ComponentRoute => ({
        kind,
        prefix,
        ...rowFor(`${prefix}${kind}`)
    });

    it('resolves a button by the stable prefix of its minted wire', () => {
        const approve = new CustomId('approve').snowflake('userId');
        const maps = buildRouteMaps(manifestWith({ componentRoutes: [componentRow('button', 'approve')] }));

        const match = resolve(maps, component(2, approve.encode({ userId: '123' })));

        expect(match).toMatchObject({ kind: 'button', routeId: 'button:approve' });
    });

    it('routes a wire whose layout hash drifted to the same prefix, the handler decode validates later', () => {
        const drifted = new CustomId('approve').snowflake('userId').bool('force');
        const maps = buildRouteMaps(manifestWith({ componentRoutes: [componentRow('button', 'approve')] }));

        const match = resolve(maps, component(2, drifted.encode({ userId: '123', force: true })));

        expect(match?.routeId).toBe('button:approve');
    });

    it('keys each select kind into its own map with the core route id naming', () => {
        const feed = new CustomId('feed').snowflake('channelId');
        const maps = buildRouteMaps(
            manifestWith({
                componentRoutes: [componentRow('stringSelect', 'feed'), componentRow('channelSelect', 'feed')]
            })
        );
        const wire = feed.encode({ channelId: '5' });

        expect(resolve(maps, component(3, wire))).toMatchObject({ routeId: 'stringMenu:feed' });
        expect(resolve(maps, component(8, wire))).toMatchObject({ routeId: 'channelMenu:feed' });
        expect(resolve(maps, component(5, wire))).toMatchObject({ kind: 'userMenu', routeId: null });
    });

    it('resolves null for an unrecognized component type', () => {
        const maps = buildRouteMaps(manifestWith({ componentRoutes: [componentRow('button', 'approve')] }));

        expect(resolve(maps, component(99, 'approve:1'))).toBeNull();
    });

    it('keys the user, role, and mentionable select kinds', () => {
        const pick = new CustomId('pick').snowflake('guildId');
        const maps = buildRouteMaps(
            manifestWith({
                componentRoutes: [
                    componentRow('userSelect', 'pick'),
                    componentRow('roleSelect', 'pick'),
                    componentRow('mentionableSelect', 'pick')
                ]
            })
        );
        const wire = pick.encode({ guildId: '9' });

        expect(resolve(maps, component(5, wire))).toMatchObject({ routeId: 'userMenu:pick' });
        expect(resolve(maps, component(6, wire))).toMatchObject({ routeId: 'roleMenu:pick' });
        expect(resolve(maps, component(7, wire))).toMatchObject({ routeId: 'mentionableMenu:pick' });
    });

    it('resolves a modal submit by prefix through the modal map', () => {
        const config = new CustomId('cfg').str('section');
        const maps = buildRouteMaps(manifestWith({ componentRoutes: [componentRow('modal', 'cfg')] }));
        // justified: resolve reads only type and data off the payload
        const payload = {
            type: 5,
            data: { custom_id: config.encode({ section: 'general' }) }
        } as unknown as APIInteraction;

        expect(resolve(maps, payload)).toMatchObject({ kind: 'modal', routeId: 'modal:cfg' });
    });

    it('resolves the unhandled default for a wire no prefix owns', () => {
        const maps = buildRouteMaps(manifestWith({ componentRoutes: [componentRow('button', 'approve')] }));

        expect(resolve(maps, component(2, 'other-app-id'))).toMatchObject({ kind: 'button', routeId: null });
    });
});
