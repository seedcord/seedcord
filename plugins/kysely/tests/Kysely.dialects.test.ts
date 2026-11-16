import { describe, expect } from 'vite-plus/test';

import { memoryNodeSqlite, memoryPostgres, memorySqlite } from './utils/dialects';
import { pluginsPath } from './utils/source-path';
import { it as base } from './utils/test-env';

import type { Kysely } from '#src/Kysely';
import type { Dialect } from 'kysely';

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
        return this.db.selectFrom(this.table).selectAll().where('id', '=', id).executeTakeFirst();
    }
}
`;

const it = base.extend<{ startedOn: (dialect: () => Dialect) => Promise<Kysely> }>({
    startedOn: async ({ kyselyWith, testEnv }, use) => {
        await testEnv.createFile('migrations/001_users.ts', MIGRATION);
        await testEnv.createFile('services/Users.ts', SERVICE);
        await use(async (dialect) => {
            const plugin = kyselyWith({ dialect });
            await plugin.init();
            return plugin;
        });
    }
});

// justified: codegen hasn't typed the services map in these tests, and SERVICE above defines Users
const usersOf = (plugin: Kysely): UsersService => plugin.services['users' as never];

describe.for([
    ['SQLite', memorySqlite],
    ['node:sqlite through nodeSqlite', memoryNodeSqlite],
    ['Postgres through PGlite', memoryPostgres]
] as const)('on %s', ([, dialect]) => {
    // one test per dialect because PGlite takes about half a second to start
    it('runs the startup migration, a service query, and a rolled-back transaction', async ({ startedOn }) => {
        const plugin = await startedOn(dialect);
        const users = usersOf(plugin);

        await users.add(1, 'ada');
        await users.add(2, 'bob');
        await expect(
            plugin.connection.transaction().execute(async (trx) => {
                // justified: codegen hasn't typed the schema in these tests either
                await trx
                    .insertInto('users' as never)
                    .values({ id: 3, username: 'gone' })
                    .execute();
                throw new Error('roll back');
            })
        ).rejects.toThrow('roll back');

        expect(await plugin.listPendingMigrations()).toEqual([]);
        expect(await users.byId(2)).toMatchObject({ id: 2, username: 'bob' });
        expect(await users.byId(3)).toBeUndefined();
    });
});
