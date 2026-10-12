import { SeedcordErrorCode } from '@seedcord/errors';
import { setBotRoot } from '@seedcord/utils/node/internal';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyPostgres } from '#src/KyselyPostgres';

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
        setBotRoot(testEnv.rootDir);
    });

    afterEach(async () => {
        setBotRoot(undefined);
        await testEnv.teardown();
    });

    async function listedNames(migrations: KyselyMigrationsOptions): Promise<string[]> {
        // the plugin reads nothing off core, this only satisfies the constructor
        const core = { config: {} } as unknown as CoreBase;
        const plugin = new KyselyPostgres(core, {
            connectionString: 'postgres://localhost:5432/test',
            migrations,
            dir: './services'
        });
        await plugin.init();
        const listed = await plugin.listMigrations();
        return listed.map((info) => info.name);
    }

    // a dev bot loads the .ts file and a built bot the .js one
    it.each(['ts', 'js'])('reads a relative dir from root and names a .%s file without it', async (extension) => {
        await testEnv.createFile(`migrations/001-create-users.${extension}`, NAMED_EXPORTS);

        await expect(listedNames({ dir: './migrations' })).resolves.toEqual(['001-create-users']);
    });

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
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyDuplicateMigrationName })
        );
    });
});
