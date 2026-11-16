import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';

import { Kysely } from '#src/Kysely';

import { memoryPostgres, memorySqlite } from './utils/dialects';
import { pluginsPath } from './utils/source-path';
import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

interface UsersService {
    add(id: number, username: string): Promise<void>;
    byId(id: number): Promise<{ id: number; username: string } | undefined>;
}

const MIGRATION = `
export async function up(db) {
    await db.schema
        .createTable('users')
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('username', 'varchar(64)', (col) => col.notNull())
        .execute();
}
`;

const SERVICE = `
import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

@RegisterKyselyService('users')
export class Users extends KyselyService<'users'> {
    public async add(id: number, username: string) {
        await this.db.insertInto(this.table).values({ id, username }).execute();
    }

    public byId(id: number) {
        return this.db.selectFrom(this.table).selectAll().where('id', '=', id).where('username', '!=', '').executeTakeFirst();
    }
}
`;

describe.each([
    ['SQLite', memorySqlite],
    ['Postgres through PGlite', memoryPostgres]
])('on %s', (_name, dialect) => {
    let testEnv: TestEnvironment;
    let plugin: Kysely;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-dialects-');
        await testEnv.setup();
        await testEnv.createFile('migrations/001_users.ts', MIGRATION);
        await testEnv.createFile('services/Users.ts', SERVICE);
        // the plugin never reads core. this only satisfies the constructor
        const core = { config: {} } as unknown as CoreBase;
        plugin = new Kysely(core, {
            dialect,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });
        await plugin.init();
    });

    afterEach(async () => {
        await plugin.dispose();
        await testEnv.teardown();
    });

    it('runs the startup migration and a service query with two parameters', async () => {
        // justified: codegen hasn't typed the services map in this test, and the fixture above defines Users
        const users = plugin.services['users' as never] as UsersService;

        await users.add(1, 'ada');
        await users.add(2, 'bob');

        expect(await users.byId(2)).toMatchObject({ id: 2, username: 'bob' });
        expect(await plugin.listPendingMigrations()).toEqual([]);
    });

    it('rolls back a transaction that throws', async () => {
        // justified: codegen hasn't typed the services map in this test, and the fixture above defines Users
        const users = plugin.services['users' as never] as UsersService;

        const failed = plugin.connection.transaction().execute(async (trx) => {
            await trx
                .insertInto('users' as never)
                .values({ id: 3, username: 'gone' })
                .execute();
            throw new Error('roll back');
        });

        await expect(failed).rejects.toThrow('roll back');
        expect(await users.byId(3)).toBeUndefined();
    });
});
