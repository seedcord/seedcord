import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { setDevFiles } from '@seedcord/utils/internal';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';

import { KyselyPostgres } from '#src/KyselyPostgres';

import { TestEnvironment } from './utils/test-env';

import type { KyselyMigrationsOptions } from '#src/types/KyselyOptions';
import type { CoreBase } from '@seedcord/core';

// the pg mock shares one query function across pools
const { poolQuery } = (await import('pg')) as unknown as { poolQuery: Mock };

const NAMED_EXPORTS = 'export async function up() {}\nexport async function down() {}\n';

// one shared timestamp leaves kysely to order the rows by name
function seedRanMigrations(names: string[]): void {
    const ranAt = new Date('2026-01-01T00:00:00Z').toISOString();
    const rows = names.map((name) => ({ name, timestamp: ranAt }));
    poolQuery.mockImplementation((sql: unknown) =>
        Promise.resolve({ rows: String(sql).startsWith('select "name", "timestamp"') ? rows : [] })
    );
}

describe('KyselyMigrationManager', () => {
    let testEnv: TestEnvironment;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-migrations-test-');
        await testEnv.setup();
        await testEnv.createFile('services/.keep', '');
        const dev = setDevFiles({
            root: testEnv.rootDir,
            listed: [],
            skippedFolders: []
        });
        return () => dev[Symbol.dispose]();
    });

    afterEach(async () => {
        poolQuery.mockResolvedValue({ rows: [] });
        await testEnv.teardown();
    });

    async function initializedPlugin(migrations: KyselyMigrationsOptions): Promise<KyselyPostgres> {
        // the plugin reads nothing off core, this only satisfies the constructor
        const core = { config: {} } as unknown as CoreBase;
        const plugin = new KyselyPostgres(core, {
            connectionString: 'postgres://localhost:5432/test',
            migrations,
            dir: './services'
        });
        await plugin.init();
        return plugin;
    }

    async function listedNames(migrations: KyselyMigrationsOptions): Promise<string[]> {
        const plugin = await initializedPlugin(migrations);
        const listed = await plugin.listMigrations();
        return listed.map((info) => info.name);
    }

    // a dev bot loads the .ts file and a built bot the .js one
    it.each(['ts', 'js'])(
        'reads a relative dir from root and names a .%s migration without the extension',
        async (extension) => {
            await testEnv.createFile(`migrations/001-create-users.${extension}`, NAMED_EXPORTS);

            await expect(listedNames({ dir: './migrations' })).resolves.toEqual(['001-create-users']);
        }
    );

    it('reads a migration from a default export', async () => {
        await testEnv.createFile(
            'migrations/001-create-users.ts',
            'export default { async up() {}, async down() {} };\n'
        );

        await expect(listedNames({ dir: './migrations' })).resolves.toEqual(['001-create-users']);
    });

    it('reads a migration with only up', async () => {
        await testEnv.createFile('migrations/001-create-users.ts', 'export async function up() {}\n');

        await expect(listedNames({ dir: './migrations' })).resolves.toEqual(['001-create-users']);
    });

    it('lists nothing for an empty dir', async () => {
        await testEnv.createFile('migrations/.keep', '');

        await expect(listedNames({ dir: './migrations' })).resolves.toEqual([]);
    });

    it('throws on a helper file in the dir', async () => {
        await testEnv.createFile('migrations/helpers.ts', 'export const tableName = "users";\n');

        await expect(listedNames({ dir: './migrations' })).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyInvalidMigrationModule })
        );
    });

    it('reads subfolders and throws when two files share a name', async () => {
        await testEnv.createFile('migrations/users/001-init.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/guilds/001-init.ts', NAMED_EXPORTS);

        await expect(listedNames({ dir: './migrations' })).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );
    });

    // kysely orders run migrations that share a timestamp with nameComparator
    it('passes nameComparator to kysely for two migrations that ran at the same time', async () => {
        await testEnv.createFile('migrations/B.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/a.ts', NAMED_EXPORTS);
        seedRanMigrations(['B', 'a']);

        const byCodeUnit = (nameA: string, nameB: string): number => (nameA < nameB ? -1 : Number(nameA > nameB));
        const plugin = await initializedPlugin({ dir: './migrations', onStartup: false, nameComparator: byCodeUnit });

        await expect(plugin.migrate()).resolves.toBeUndefined();
    });

    it('stops migrateDown at the newest migration when it has no down', async () => {
        await testEnv.createFile('migrations/001-users.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/002-guilds.ts', 'export async function up() {}\n');
        seedRanMigrations(['001-users', '002-guilds']);
        const plugin = await initializedPlugin({ dir: './migrations', onStartup: false });
        const info = vi.spyOn(Logger.prototype, 'info');

        try {
            await plugin.migrateDown({ steps: 3 });
            const skipped = info.mock.calls.map(([line]) => String(line)).filter((line) => line.includes('(skipped)'));
            expect(skipped).toEqual([expect.stringContaining('002-guilds')]);
        } finally {
            info.mockRestore();
        }
    });
});
