import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { KyselyPostgres } from '@src/KyselyPostgres';

import { TestEnvironment } from './utils/test-env';

import type { Core } from '@seedcord/gateway';

// the pg mock shares one `end` across pool instances so the close is assertable
const { poolEnd } = (await import('pg')) as unknown as { poolEnd: ReturnType<typeof vi.fn> };

describe('KyselyPostgres lifecycle', () => {
    let testEnv: TestEnvironment;
    let mockCore: Core;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-lifecycle-');
        await testEnv.setup();
        await testEnv.createFile('migrations/.keep', '');
        await testEnv.createFile('services/.keep', '');
        // the plugin reads only shutdown off core
        mockCore = {
            shutdown: { addTask: vi.fn() },
            startup: { addTask: vi.fn() },
            config: {}
        } as unknown as Core;
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Database type param is irrelevant here
    function build(timeout?: number): KyselyPostgres<any> {
        return new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services'),
            ...(timeout !== undefined && { timeout })
        });
    }

    it('throws when services is read before init', () => {
        const plugin = build();

        expect(() => plugin.services).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyServicesNotReady })
        );
    });

    it('registers a shutdown task carrying the configured timeout', () => {
        build(5000);

        expect(mockCore.shutdown.addTask).toHaveBeenCalledWith(
            expect.anything(),
            'stop-kysely-postgres',
            expect.any(Function),
            5000
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

    it('closes the pool on stop', async () => {
        const plugin = build();
        await plugin.init();
        // the bootstrapper opens and closes an admin pool during init so only count the stop
        poolEnd.mockClear();

        await plugin.stop();

        expect(poolEnd).toHaveBeenCalled();
    });

    it('stops without throwing when init never ran', async () => {
        const plugin = build();

        await expect(plugin.stop()).resolves.toBeUndefined();
    });

    it('translates a pool close failure into PluginKyselyDisconnectFailed', async () => {
        const plugin = build();
        await plugin.init();
        poolEnd.mockRejectedValueOnce(new Error('still busy'));

        await expect(plugin.stop()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyDisconnectFailed })
        );
    });
});
