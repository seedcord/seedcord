import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { CleanRunner } from '#commands/commands/CleanRunner';

import type { Flagged } from '#commands/commands/classify';
import type { REST } from '@discordjs/rest';
import type { Mock } from 'vitest';

function fakeRest(get: Mock, del: Mock): () => Pick<REST, 'get' | 'delete'> {
    return () => ({ get, delete: del });
}

function routedGet(overrides: Record<string, unknown> = {}): Mock {
    const routes: Record<string, unknown> = {
        '/applications/@me': { id: 'app1' },
        '/applications/app1/commands': [{ id: 'g0', name: 'ban' }],
        '/applications/app1/guilds/g1/commands': [
            { id: '1', name: 'ban' },
            { id: '2', name: 'setup' }
        ],
        ...overrides
    };
    return vi.fn((route: string) => Promise.resolve(routes[route] ?? []));
}

const alpha = { id: 'g1', name: 'Alpha' };

describe('CleanRunner.resolveTargets', () => {
    it('throws CliCleanNoGuilds for no guilds and no --all-guilds, without any REST call', async () => {
        const get = routedGet();
        const runner = new CleanRunner(fakeRest(get, vi.fn()));

        await expect(
            runner.resolveTargets({ guildIds: [], allGuilds: false, purge: false }, 'token')
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliCleanNoGuilds });
        expect(get).not.toHaveBeenCalled();
    });

    it('throws CliCleanPurgeAllGuilds for --purge with --all-guilds, without any REST call', async () => {
        const get = routedGet();
        const runner = new CleanRunner(fakeRest(get, vi.fn()));

        await expect(
            runner.resolveTargets({ guildIds: [], allGuilds: true, purge: true }, 'token')
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliCleanPurgeAllGuilds });
        expect(get).not.toHaveBeenCalled();
    });

    it('returns the named guilds (name falls back to id) and the resolved app id', async () => {
        const runner = new CleanRunner(fakeRest(routedGet(), vi.fn()));

        await expect(
            runner.resolveTargets({ guildIds: ['g1', 'g2'], allGuilds: false, purge: false }, 'token')
        ).resolves.toEqual({
            appId: 'app1',
            guilds: [
                { id: 'g1', name: 'g1' },
                { id: 'g2', name: 'g2' }
            ]
        });
    });

    it('lists every guild the bot is in, with names, for --all-guilds', async () => {
        const get = routedGet({
            '/users/@me/guilds': [
                { id: 'g1', name: 'Alpha' },
                { id: 'g7', name: 'Beta' }
            ]
        });
        const runner = new CleanRunner(fakeRest(get, vi.fn()));

        await expect(runner.resolveTargets({ guildIds: [], allGuilds: true, purge: false }, 'token')).resolves.toEqual({
            appId: 'app1',
            guilds: [
                { id: 'g1', name: 'Alpha' },
                { id: 'g7', name: 'Beta' }
            ]
        });
    });

    it('throws CliCleanAppFetchFailed when the application lookup fails', async () => {
        const get = vi.fn(() => Promise.reject(new Error('401')));
        const runner = new CleanRunner(fakeRest(get, vi.fn()));

        await expect(
            runner.resolveTargets({ guildIds: ['g1'], allGuilds: false, purge: false }, 'token')
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliCleanAppFetchFailed });
    });
});

describe('CleanRunner.listBotGuilds', () => {
    it('returns the id and name of every guild, paged', async () => {
        const get = routedGet({
            '/users/@me/guilds': [
                { id: 'g1', name: 'Alpha' },
                { id: 'g2', name: 'Beta' }
            ]
        });
        const runner = new CleanRunner(fakeRest(get, vi.fn()));

        await expect(runner.listBotGuilds('token')).resolves.toEqual([
            { id: 'g1', name: 'Alpha' },
            { id: 'g2', name: 'Beta' }
        ]);
    });
});

describe('CleanRunner.scanGuilds', () => {
    it('flags only the overlapping guild command with its guild name, and counts what it scanned', async () => {
        const runner = new CleanRunner(fakeRest(routedGet(), vi.fn()));

        const result = await runner.scanGuilds('token', 'app1', [alpha], false);

        expect(result.flagged).toEqual([
            { guildId: 'g1', guildName: 'Alpha', id: '1', name: 'ban', reason: 'overlap' }
        ]);
        expect(result.skipped).toEqual([]);
        expect(result.scannedGuildCount).toBe(1);
        expect(result.scannedCommandCount).toBe(2);
        expect(result.globalCommandCount).toBe(1);
    });

    it('flags every guild command under --purge', async () => {
        const runner = new CleanRunner(fakeRest(routedGet(), vi.fn()));

        const result = await runner.scanGuilds('token', 'app1', [alpha], true);

        expect(result.flagged.map((f) => f.id)).toEqual(['1', '2']);
        expect(result.flagged.every((f) => f.reason === 'purge')).toBe(true);
    });

    it('records a skipped guild with its name and keeps scanning the rest', async () => {
        const get = vi.fn((route: string) => {
            if (route === '/applications/app1/commands') return Promise.resolve([{ id: 'g0', name: 'ban' }]);
            if (route === '/applications/app1/guilds/bad/commands') return Promise.reject(new Error('403'));
            if (route === '/applications/app1/guilds/g1/commands') return Promise.resolve([{ id: '1', name: 'ban' }]);
            return Promise.resolve([]);
        });
        const runner = new CleanRunner(fakeRest(get, vi.fn()));

        const result = await runner.scanGuilds('token', 'app1', [{ id: 'bad', name: 'Bad' }, alpha], false);

        expect(result.flagged).toEqual([
            { guildId: 'g1', guildName: 'Alpha', id: '1', name: 'ban', reason: 'overlap' }
        ]);
        expect(result.skipped).toEqual([{ guildId: 'bad', guildName: 'Bad', reason: '403' }]);
        expect(result.scannedGuildCount).toBe(1);
    });
});

describe('CleanRunner.applyDeletions', () => {
    const flagged: Flagged[] = [
        { guildId: 'g1', guildName: 'Alpha', id: '1', name: 'ban', reason: 'overlap' },
        { guildId: 'g1', guildName: 'Alpha', id: '2', name: 'setup', reason: 'purge' }
    ];

    it('deletes through guild routes only and counts what it removed', async () => {
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(fakeRest(routedGet(), del));

        const result = await runner.applyDeletions('token', 'app1', flagged);

        expect(result.deleted).toBe(2);
        expect(result.failed).toEqual([]);
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/1');
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/2');
    });

    it('records a failed delete and keeps going', async () => {
        const del = vi.fn((route: string) =>
            route.endsWith('/1') ? Promise.reject(new Error('500')) : Promise.resolve({})
        );
        const runner = new CleanRunner(fakeRest(routedGet(), del));

        const result = await runner.applyDeletions('token', 'app1', flagged);

        expect(result.deleted).toBe(1);
        expect(result.failed).toEqual([{ command: flagged[0], reason: '500' }]);
    });
});
