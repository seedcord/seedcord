import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { SqliteDialect, sql } from 'kysely';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';

import { Kysely } from '#src/Kysely';

import { heldSqlite, memorySqlite } from './utils/dialects';
import { TestEnvironment } from './utils/test-env';

import type { KyselyOptions } from '#src/types/KyselyOptions';
import type { CoreBase } from '@seedcord/core';

describe('Kysely lifecycle', () => {
    let testEnv: TestEnvironment;
    let mockCore: CoreBase;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-lifecycle-');
        await testEnv.setup();
        await testEnv.createFile('migrations/.keep', '');
        await testEnv.createFile('services/.keep', '');
        // the plugin never reads core. this only satisfies the constructor
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    function build(options: Partial<KyselyOptions> = {}): Kysely {
        return new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services'),
            ...options
        });
    }

    it('translates a dialect() that throws into PluginConnectionFailed', async () => {
        const plugin = build({
            dialect: () => {
                throw new Error('bad option');
            }
        });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginConnectionFailed })
        );
    });

    it('translates a refused connection into PluginConnectionFailed', async () => {
        const plugin = build({
            dialect: () => new SqliteDialect({ database: () => Promise.reject(new Error('ECONNREFUSED')) })
        });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginConnectionFailed })
        );
    });

    it('calls dialect() in init() and never during codegen()', async () => {
        const dialect = vi.fn(memorySqlite);
        const plugin = build({ dialect });

        await plugin.codegen();
        expect(dialect).not.toHaveBeenCalled();

        await plugin.init();
        expect(dialect).toHaveBeenCalledOnce();
    });

    it('retries after a failed init', async () => {
        const dialect = vi.fn(memorySqlite).mockImplementationOnce(() => {
            throw new Error('bad option');
        });
        const plugin = build({ dialect });
        await expect(plugin.init()).rejects.toThrow();

        await plugin.init();

        expect(plugin.services).toEqual({});
    });

    it('closes the connection when service loading fails after connecting', async () => {
        const held = heldSqlite();
        const plugin = build({ dialect: held.dialect, dir: testEnv.resolvePath('absent') });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathUnreadable })
        );

        expect(held.database.open).toBe(false);
    });

    it('keeps the init failure when the cleanup close also fails', async () => {
        const held = heldSqlite();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });
        const plugin = build({ dialect: held.dialect, dir: testEnv.resolvePath('absent') });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathUnreadable })
        );
    });

    it.each(['services', 'connection'] as const)('throws when %s is read before init', (member) => {
        const plugin = build();

        expect(() => plugin[member]).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginServicesNotReady })
        );
    });

    it('exposes a working connection and the services map once init resolves', async () => {
        const plugin = build();

        await plugin.init();

        const { rows } = await sql<{ one: number }>`select 1 as one`.execute(plugin.connection);
        expect(rows).toEqual([{ one: 1 }]);
        expect(plugin.services).toEqual({});
    });

    it('closes the connection on dispose', async () => {
        const held = heldSqlite();
        const plugin = build({ dialect: held.dialect });
        await plugin.init();

        await plugin.dispose();

        expect(held.database.open).toBe(false);
    });

    it('builds a new connection when init runs after dispose', async () => {
        const dialect = vi.fn(memorySqlite);
        const plugin = build({ dialect });
        await plugin.init();
        await plugin.dispose();

        await plugin.init();

        expect(dialect).toHaveBeenCalledTimes(2);
        await expect(sql`select 1`.execute(plugin.connection)).resolves.toBeDefined();
    });

    it.each(['services', 'connection'] as const)('reports %s unavailable after dispose', async (member) => {
        const plugin = build();
        await plugin.init();

        await plugin.dispose();

        expect(() => plugin[member]).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginServicesNotReady })
        );
    });

    it('disposes without throwing when init never ran', async () => {
        const plugin = build();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });

    it('translates a close failure into PluginDisconnectFailed', async () => {
        const held = heldSqlite();
        const plugin = build({ dialect: held.dialect });
        await plugin.init();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });

        await expect(plugin.dispose()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginDisconnectFailed })
        );
    });

    it('reports a close failure once, through the thrown error', async () => {
        const held = heldSqlite();
        const plugin = build({ dialect: held.dialect });
        await plugin.init();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });
        const logged = vi.spyOn(Logger.prototype, 'error');

        await plugin.dispose().catch(() => undefined);

        expect(logged).not.toHaveBeenCalled();
        logged.mockRestore();
    });
});
