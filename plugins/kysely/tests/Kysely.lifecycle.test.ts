import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { SqliteDialect, sql } from 'kysely';
import { describe, expect, vi } from 'vite-plus/test';

import { heldSqlite, memorySqlite } from './utils/dialects';
import { it } from './utils/test-env';

describe('Kysely lifecycle', () => {
    it('rethrows the error from a dialect() that throws', async ({ kyselyWith }) => {
        const thrown = new Error('DATABASE_URL is required');
        const plugin = kyselyWith({
            dialect: () => {
                throw thrown;
            }
        });

        await expect(plugin.init()).rejects.toBe(thrown);
    });

    it('includes the driver message when the connection is refused', async ({ kyselyWith }) => {
        const refused = new Error('connect ECONNREFUSED 127.0.0.1:5432');
        const plugin = kyselyWith({ dialect: () => new SqliteDialect({ database: () => Promise.reject(refused) }) });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.PluginConnectionFailed,
                message: expect.stringMatching(/connect ECONNREFUSED 127\.0\.0\.1:5432.*database is running/) as string
            })
        );
    });

    it('calls dialect() in init() and never during codegen()', async ({ kyselyWith }) => {
        const dialect = vi.fn(memorySqlite);
        const plugin = kyselyWith({ dialect });

        await plugin.codegen();
        expect(dialect).not.toHaveBeenCalled();

        await plugin.init();
        expect(dialect).toHaveBeenCalledOnce();
    });

    it('retries after a failed init', async ({ kyselyWith }) => {
        const dialect = vi.fn(memorySqlite).mockImplementationOnce(() => {
            throw new Error('bad option');
        });
        const plugin = kyselyWith({ dialect });
        await expect(plugin.init()).rejects.toThrow();

        await plugin.init();

        expect(plugin.services).toEqual({});
    });

    it('closes the connection when service loading fails after connecting', async ({ kyselyWith, testEnv }) => {
        const held = heldSqlite();
        const plugin = kyselyWith({ dialect: held.dialect, path: testEnv.resolvePath('absent') });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathUnreadable })
        );

        expect(held.database.open).toBe(false);
    });

    it('keeps the init failure when the cleanup close also fails', async ({ kyselyWith, testEnv }) => {
        const held = heldSqlite();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });
        const plugin = kyselyWith({ dialect: held.dialect, path: testEnv.resolvePath('absent') });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathUnreadable })
        );
    });

    it.for(['services', 'connection'] as const)('throws when %s is read before init', (member, { kyselyWith }) => {
        const plugin = kyselyWith();

        expect(() => plugin[member]).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginNotReady }));
    });

    it('closes the connection on dispose', async ({ kyselyWith }) => {
        const held = heldSqlite();
        const plugin = kyselyWith({ dialect: held.dialect });
        await plugin.init();

        await plugin.dispose();

        expect(held.database.open).toBe(false);
    });

    it('builds a new connection when init runs after dispose', async ({ kyselyWith }) => {
        const dialect = vi.fn(memorySqlite);
        const plugin = kyselyWith({ dialect });
        await plugin.init();
        await plugin.dispose();

        await plugin.init();

        expect(dialect).toHaveBeenCalledTimes(2);
        await expect(sql`select 1`.execute(plugin.connection)).resolves.toBeDefined();
    });

    it.for(['services', 'connection'] as const)(
        'reports %s unavailable after dispose',
        async (member, { kyselyWith }) => {
            const plugin = kyselyWith();
            await plugin.init();

            await plugin.dispose();

            expect(() => plugin[member]).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginNotReady }));
        }
    );

    it('disposes without throwing when init never ran', async ({ kyselyWith }) => {
        const plugin = kyselyWith();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });

    it('throws PluginDisconnectFailed on a close failure without logging it too', async ({ kyselyWith }) => {
        const held = heldSqlite();
        const plugin = kyselyWith({ dialect: held.dialect });
        await plugin.init();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });
        using logged = vi.spyOn(Logger.prototype, 'error');

        await expect(plugin.dispose()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginDisconnectFailed })
        );
        expect(logged).not.toHaveBeenCalled();
    });
});
