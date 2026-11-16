import { DatabaseSync } from 'node:sqlite';

import { Kysely, SqliteDialect } from 'kysely';
import { describe, expect, onTestFinished, it } from 'vite-plus/test';

import { nodeSqlite } from '#src/nodeSqlite';

interface Schema {
    notes: { first: unknown; second: string };
}

async function notesTable(): Promise<Kysely<Schema>> {
    const db = new Kysely<Schema>({
        dialect: new SqliteDialect({ database: nodeSqlite(new DatabaseSync(':memory:')) })
    });
    onTestFinished(() => db.destroy());
    await db.schema.createTable('notes').addColumn('first', 'text').addColumn('second', 'text').execute();
    return db;
}

describe('nodeSqlite', () => {
    it('binds each parameter to its own column', async () => {
        const db = await notesTable();

        await db.insertInto('notes').values({ first: 'a', second: 'b' }).execute();

        expect(await db.selectFrom('notes').selectAll().execute()).toEqual([{ first: 'a', second: 'b' }]);
    });

    // node:sqlite reads a leading object as named parameters and shifts the rest left
    it('rejects a Date in the first parameter instead of shifting the others', async () => {
        const db = await notesTable();

        await expect(db.insertInto('notes').values({ first: new Date(), second: 'b' }).execute()).rejects.toThrow(
            /cannot be bound/
        );
        expect(await db.selectFrom('notes').selectAll().execute()).toEqual([]);
    });
});
