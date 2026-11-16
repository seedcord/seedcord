import { SeedcordErrorCode } from '@seedcord/errors';
import { setDevFiles } from '@seedcord/utils/internal';
import { sql } from 'kysely';
import { describe, expect } from 'vite-plus/test';

import { it as base } from './utils/test-env';

import type { Kysely } from '#src/Kysely';
import type { KyselyMigrationsOptions } from '#src/types/KyselyOptions';

const NAMED_EXPORTS = 'export async function up() {}\nexport async function down() {}\n';

// these tests run as a dev bot rooted at the test folder because relative dirs resolve against root
const it = base.extend<{ startedWith: (migrations: KyselyMigrationsOptions) => Promise<Kysely> }>({
    startedWith: async ({ kyselyWith, testEnv }, use) => {
        using _dev = setDevFiles({ root: testEnv.rootDir, listed: [], skippedFolders: [] });
        await use(async (migrations) => {
            const plugin = kyselyWith({ migrations, dir: './services' });
            await plugin.init();
            return plugin;
        });
    }
});

describe('KyselyMigrationManager', () => {
    async function listedNames(
        startedWith: (migrations: KyselyMigrationsOptions) => Promise<Kysely>,
        migrations: KyselyMigrationsOptions
    ): Promise<string[]> {
        const plugin = await startedWith(migrations);
        const listed = await plugin.listMigrations();
        return listed.map((info) => info.name);
    }

    // a dev bot loads the .ts file and a built bot the .js one
    it.for(['ts', 'js'])(
        'reads a relative dir from root and returns the name of a .%s migration without the extension',
        async (extension, { startedWith, testEnv }) => {
            await testEnv.createFile(`migrations/001-create-users.${extension}`, NAMED_EXPORTS);

            await expect(listedNames(startedWith, { dir: './migrations' })).resolves.toEqual(['001-create-users']);
        }
    );

    it('reads a migration from a default export', async ({ startedWith, testEnv }) => {
        await testEnv.createFile(
            'migrations/001-create-users.ts',
            'export default { async up() {}, async down() {} };\n'
        );

        await expect(listedNames(startedWith, { dir: './migrations' })).resolves.toEqual(['001-create-users']);
    });

    it('reads a migration with only up', async ({ startedWith, testEnv }) => {
        await testEnv.createFile('migrations/001-create-users.ts', 'export async function up() {}\n');

        await expect(listedNames(startedWith, { dir: './migrations' })).resolves.toEqual(['001-create-users']);
    });

    it('returns an empty list for an empty dir', async ({ startedWith }) => {
        await expect(listedNames(startedWith, { dir: './migrations' })).resolves.toEqual([]);
    });

    it('throws on a helper file in the dir', async ({ startedWith, testEnv }) => {
        await testEnv.createFile('migrations/helpers.ts', 'export const tableName = "users";\n');

        await expect(listedNames(startedWith, { dir: './migrations' })).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyInvalidMigrationModule })
        );
    });

    it('reads subfolders and throws when two files share a name', async ({ startedWith, testEnv }) => {
        await testEnv.createFile('migrations/users/001-init.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/guilds/001-init.ts', NAMED_EXPORTS);

        await expect(listedNames(startedWith, { dir: './migrations' })).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );
    });

    // kysely orders run migrations that share a timestamp with nameComparator
    it('passes nameComparator to kysely for two migrations that ran at the same time', async ({
        startedWith,
        testEnv
    }) => {
        await testEnv.createFile('migrations/B.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/a.ts', NAMED_EXPORTS);
        const byCodeUnit = (nameA: string, nameB: string): number => (nameA < nameB ? -1 : Number(nameA > nameB));
        const plugin = await startedWith({ dir: './migrations', nameComparator: byCodeUnit });
        await sql`update kysely_migration set timestamp = ${new Date('2026-01-01T00:00:00Z').toISOString()}`.execute(
            plugin.connection
        );

        await expect(plugin.migrate()).resolves.toBeUndefined();
    });

    it('stops migrateDown at the newest migration when it is missing a down', async ({ startedWith, testEnv }) => {
        await testEnv.createFile('migrations/001-users.ts', NAMED_EXPORTS);
        await testEnv.createFile('migrations/002-guilds.ts', 'export async function up() {}\n');
        const plugin = await startedWith({ dir: './migrations' });

        await plugin.migrateDown({ steps: 3 });

        await expect(plugin.listPendingMigrations()).resolves.toEqual([]);
    });
});
