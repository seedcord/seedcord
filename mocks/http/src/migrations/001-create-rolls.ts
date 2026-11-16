import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
    await db.schema
        .createTable('rolls')
        .addColumn('id', 'integer', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('sides', 'integer', (col) => col.notNull())
        .addColumn('value', 'integer', (col) => col.notNull())
        .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('rolls').execute();
}
