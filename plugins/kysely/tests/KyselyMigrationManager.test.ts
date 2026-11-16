import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { setDevFiles } from '@seedcord/utils/internal';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { Kysely } from '#src/Kysely';

import { memorySqlite } from './utils/dialects';
import { TestEnvironment } from './utils/test-env';

import type { KyselyMigrationsOptions } from '#src/types/KyselyOptions';
import type { CoreBase } from '@seedcord/core';

const NAMED_EXPORTS = 'export async function up() {}\nexport async function down() {}\n';

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
        await testEnv.teardown();
    });

    async function initializedPlugin(migrations: KyselyMigrationsOptions): Promise<Kysely> {
        // the plugin never reads core. this only satisfies the constructor
        const core = { config: {} } as unknown as CoreBase;
        const plugin = new Kysely(core, { dialect: memorySqlite, migrations, dir: './services' });
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
        'reads a relative dir from root and returns the name of a .%s migration without the extension',
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

    it('returns an empty list for an empty dir', async () => {
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
        const byCodeUnit = (nameA: string, nameB: string): number => (nameA < nameB ? -1 : Number(nameA > nameB));
        const plugin = await initializedPlugin({ dir: './migrations', nameComparator: byCodeUnit });
        await sql`update kysely_migration set timestamp = ${new Date('2026-01-01T00:00:00Z').toISOString()}`.execute(
            plugin.connection
        );

        await expect(plugin.migrate()).resolves.toBeUndefined();
    });

    it('stops migrateDown at the newest migration when it is missing a down', async () => {
        await testEnv.createFile('migrations/001-users.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/002-guilds.ts', 'export async function up() {}\n');
        const plugin = await initializedPlugin({ dir: './migrations' });
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
