import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { KyselyPostgres } from '@src/KyselyPostgres';

import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

// the pg mock shares `end` and `connect` across pool instances so both are assertable and failable
const { poolEnd, poolConnect } = (await import('pg')) as unknown as {
    poolEnd: ReturnType<typeof vi.fn>;
    poolConnect: ReturnType<typeof vi.fn>;
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

    it('closes the pool when the connection test fails', async () => {
        // targeting the admin db makes the bootstrapper skip its own pool, so the only connect is the plugin's
        const plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/postgres',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });
        poolConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        await expect(plugin.init()).rejects.toThrow('ECONNREFUSED');

        expect(poolEnd).toHaveBeenCalledTimes(1);
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
