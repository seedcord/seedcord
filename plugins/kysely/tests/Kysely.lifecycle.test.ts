import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { SqliteDialect, sql } from 'kysely';
import { describe, expect, vi } from 'vite-plus/test';

import { heldSqlite, memorySqlite } from './utils/dialects';
import { it } from './utils/test-env';

describe('Kysely lifecycle', () => {
    it('translates a dialect() that throws into PluginConnectionFailed', async ({ kyselyWith }) => {
        const plugin = kyselyWith({
            dialect: () => {
                throw new Error('bad option');
            }
        });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginConnectionFailed })
        );
    });

    it('translates a refused connection into PluginConnectionFailed', async ({ kyselyWith }) => {
        const plugin = kyselyWith({
            dialect: () => new SqliteDialect({ database: () => Promise.reject(new Error('ECONNREFUSED')) })
        });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginConnectionFailed })
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
        const plugin = kyselyWith({ dialect: held.dialect, dir: testEnv.resolvePath('absent') });

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
        const plugin = kyselyWith({ dialect: held.dialect, dir: testEnv.resolvePath('absent') });

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathUnreadable })
        );
    });

    it.for(['services', 'connection'] as const)('throws when %s is read before init', (member, { kyselyWith }) => {
        const plugin = kyselyWith();

        expect(() => plugin[member]).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginServicesNotReady })
        );
    });

    it('exposes a working connection and the services map once init resolves', async ({ kyselyWith }) => {
        const plugin = kyselyWith();

        await plugin.init();

        const { rows } = await sql<{ one: number }>`select 1 as one`.execute(plugin.connection);
        expect(rows).toEqual([{ one: 1 }]);
        expect(plugin.services).toEqual({});
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

            expect(() => plugin[member]).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginServicesNotReady })
            );
        }
    );

    it('disposes without throwing when init never ran', async ({ kyselyWith }) => {
        const plugin = kyselyWith();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });

    it('translates a close failure into PluginDisconnectFailed', async ({ kyselyWith }) => {
        const held = heldSqlite();
        const plugin = kyselyWith({ dialect: held.dialect });
        await plugin.init();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });

        await expect(plugin.dispose()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginDisconnectFailed })
        );
    });

    it('reports a close failure once, through the thrown error', async ({ kyselyWith }) => {
        const held = heldSqlite();
        const plugin = kyselyWith({ dialect: held.dialect });
        await plugin.init();
        vi.spyOn(held.database, 'close').mockImplementation(() => {
            throw new Error('still busy');
        });
        using logged = vi.spyOn(Logger.prototype, 'error');

        await plugin.dispose().catch(() => undefined);

        expect(logged).not.toHaveBeenCalled();
    });
});
