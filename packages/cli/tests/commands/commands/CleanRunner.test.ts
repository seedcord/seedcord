import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { CleanRunner } from '@commands/commands/CleanRunner';
import { SilentLogger } from '@utils/SilentLogger';

import type { REST } from '@discordjs/rest';
import type { Mock } from 'vitest';

const logger = new SilentLogger();

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

const base = { guildIds: ['g1'], allGuilds: false, apply: false, purge: false };

describe('CleanRunner', () => {
    it('throws CliCleanTokenMissing when no token is provided', async () => {
        const runner = new CleanRunner(logger, fakeRest(vi.fn(), vi.fn()), () => Promise.resolve(true));

        await expect(runner.run({ ...base, apply: true }, undefined)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliCleanTokenMissing
        });
    });

    it('deletes only the overlapping guild command on --apply, never a global command', async () => {
        const get = routedGet();
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(true));

        await runner.run({ ...base, apply: true }, 'token');

        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/1');
    });

    it('deletes nothing when the typed-count confirm fails', async () => {
        const get = routedGet();
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(false));

        await runner.run({ ...base, apply: true }, 'token');

        expect(del).not.toHaveBeenCalled();
    });

    it('deletes nothing in a dry run', async () => {
        const get = routedGet();
        const del = vi.fn(() => Promise.resolve({}));
        const confirm = vi.fn(() => Promise.resolve(true));
        const runner = new CleanRunner(logger, fakeRest(get, del), confirm);

        await runner.run({ ...base, apply: false }, 'token');

        expect(del).not.toHaveBeenCalled();
        expect(confirm).not.toHaveBeenCalled();
    });

    it('purge selects every guild command, deleting through guild routes only', async () => {
        const get = routedGet();
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(true));

        await runner.run({ ...base, apply: true, purge: true }, 'token');

        expect(del).toHaveBeenCalledTimes(2);
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/1');
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/2');
    });

    it('refuses to combine --purge with --all-guilds and touches nothing', async () => {
        const get = routedGet();
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(true));

        await runner.run({ ...base, allGuilds: true, apply: true, purge: true }, 'token');

        expect(get).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
    });

    it('scans every guild the bot is in with --all-guilds', async () => {
        const get = routedGet({ '/users/@me/guilds': [{ id: 'g1' }] });
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(true));

        await runner.run({ guildIds: [], allGuilds: true, apply: true, purge: false }, 'token');

        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/1');
    });

    it('skips a guild whose fetch fails and continues with the others', async () => {
        const get = vi.fn((route: string) => {
            if (route === '/applications/@me') return Promise.resolve({ id: 'app1' });
            if (route === '/applications/app1/commands') return Promise.resolve([{ id: 'g0', name: 'ban' }]);
            if (route === '/applications/app1/guilds/bad/commands') return Promise.reject(new Error('403'));
            if (route === '/applications/app1/guilds/g1/commands') return Promise.resolve([{ id: '1', name: 'ban' }]);
            return Promise.resolve([]);
        });
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(true));

        await runner.run({ guildIds: ['bad', 'g1'], allGuilds: false, apply: true, purge: false }, 'token');

        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith('/applications/app1/guilds/g1/commands/1');
    });

    it('throws CliCleanNoGuilds when no guilds are given, without any REST call', async () => {
        const get = routedGet();
        const del = vi.fn(() => Promise.resolve({}));
        const runner = new CleanRunner(logger, fakeRest(get, del), () => Promise.resolve(true));

        await expect(
            runner.run({ guildIds: [], allGuilds: false, apply: true, purge: false }, 'token')
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliCleanNoGuilds });
        expect(get).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
    });
});
