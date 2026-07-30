import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { KyselyPostgres } from '@src/KyselyPostgres';

import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

// the pg mock shares `end` and `connect` across pool instances so both are assertable and failable
const { poolEnd, poolConnect, poolConstruct, poolQuery } = (await import('pg')) as unknown as {
    poolEnd: ReturnType<typeof vi.fn>;
    poolConnect: ReturnType<typeof vi.fn>;
    poolConstruct: ReturnType<typeof vi.fn>;
    poolQuery: ReturnType<typeof vi.fn>;
};

describe('KyselyPostgres lifecycle', () => {
    let testEnv: TestEnvironment;
    let mockCore: CoreBase;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-lifecycle-');
        await testEnv.setup();
        await testEnv.createFile('migrations/.keep', '');
        await testEnv.createFile('services/.keep', '');
        // the plugin reads nothing off core, this only satisfies the constructor
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    function build(timeout?: number): KyselyPostgres {
        return new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services'),
            ...(timeout !== undefined && { timeout })
        });
    }

    it('translates a connect failure into PluginKyselyConnectionFailed', async () => {
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/postgres',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });
        poolConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyConnectionFailed })
        );
    });

    it('translates a bootstrap failure into PluginKyselyBootstrapFailed', async () => {
        const plugin = build();
        poolQuery.mockRejectedValueOnce(new Error('permission denied'));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyBootstrapFailed })
        );
    });

    it('closes the pool when the connection test fails', async () => {
        // targeting the admin db returns ensure() early, so the only connect is the plugin's
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/postgres',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });
        poolConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyConnectionFailed })
        );

        expect(poolEnd).toHaveBeenCalledTimes(1);
    });

    it('accepts a database another process created first', async () => {
        const plugin = build();
        // the existence check reports missing, then CREATE DATABASE hits a duplicate
        poolQuery.mockResolvedValueOnce({ rows: [] });
        poolQuery.mockRejectedValueOnce(Object.assign(new Error('duplicate database'), { code: '42P04' }));

        await expect(plugin.init()).resolves.toBeUndefined();
    });

    it('propagates a database creation failure that is not a duplicate', async () => {
        const plugin = build();
        poolQuery.mockResolvedValueOnce({ rows: [] });
        poolQuery.mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: '42501' }));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyBootstrapFailed })
        );
    });

    it('builds one pool when two callers race init', async () => {
        // targeting the admin db returns ensure() early, so the plugin's own pool is the only one built
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/postgres',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });

        await Promise.all([plugin.init(), plugin.init()]);

        expect(poolConstruct).toHaveBeenCalledTimes(1);
    });

    it('retries after a failed init', async () => {
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/postgres',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });
        poolConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        await expect(plugin.init()).rejects.toThrow();

        await plugin.init();

        expect(plugin.services).toEqual({});
    });

    it('closes the pool when service loading fails after connecting', async () => {
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('absent')
        });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDirectoryUnreadable })
        );

        // the bootstrapper's admin pool is the first close, the plugin's own pool is the second
        expect(poolEnd).toHaveBeenCalledTimes(2);
    });

    it('keeps the init failure when the cleanup close also fails', async () => {
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('absent')
        });
        // the bootstrapper's admin close comes first, the cleanup close is the one that fails
        poolEnd.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('still busy'));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDirectoryUnreadable })
        );
    });

    it('throws when services is read before init', () => {
        const plugin = build();

        expect(() => plugin.services).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyServicesNotReady })
        );
    });

    it('connects once across repeated init calls', async () => {
        const plugin = build();

        await plugin.init();
        const first = plugin.connection;
        await plugin.init();

        expect(plugin.connection).toBe(first);
    });

    it('exposes the connection and the services map once init resolves', async () => {
        const plugin = build();

        await plugin.init();

        expect(plugin.connection).toBeDefined();
        expect(plugin.services).toEqual({});
    });

    it('closes the pool on dispose', async () => {
        const plugin = build();
        await plugin.init();
        // the bootstrapper opens and closes an admin pool during init so only count the stop
        poolEnd.mockClear();

        await plugin.dispose();

        expect(poolEnd).toHaveBeenCalled();
    });

    it('reconnects when init runs after dispose', async () => {
        const plugin = build();
        await plugin.init();
        await plugin.dispose();
        poolConstruct.mockClear();

        await plugin.init();

        expect(poolConstruct).toHaveBeenCalled();
    });

    it('reports services unavailable after dispose', async () => {
        const plugin = build();
        await plugin.init();

        await plugin.dispose();

        expect(() => plugin.services).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyServicesNotReady })
        );
    });

    it('disposes without throwing when init never ran', async () => {
        const plugin = build();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });

    it('translates a pool close failure into PluginKyselyDisconnectFailed', async () => {
        const plugin = build();
        await plugin.init();
        poolEnd.mockRejectedValueOnce(new Error('still busy'));

        await expect(plugin.dispose()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyDisconnectFailed })
        );
    });
});
