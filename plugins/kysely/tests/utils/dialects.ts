import { DatabaseSync } from 'node:sqlite';

import { PGlite } from '@electric-sql/pglite';
import Database from 'better-sqlite3';
import { PGliteDialect, SqliteDialect } from 'kysely';

import { nodeSqlite } from '#src/nodeSqlite';

import type { Dialect } from 'kysely';

// init() calls this on every start, and each call opens a fresh in-memory database
export const memorySqlite = (): Dialect => new SqliteDialect({ database: new Database(':memory:') });

export const memoryNodeSqlite = (): Dialect =>
    new SqliteDialect({ database: nodeSqlite(new DatabaseSync(':memory:')) });

export const memoryPostgres = (): Dialect => new PGliteDialect({ pglite: new PGlite() });

// an in-memory database that the test can still reach after the plugin closes it
export function heldSqlite(): { database: Database.Database; dialect: () => Dialect } {
    const database = new Database(':memory:');
    return { database, dialect: () => new SqliteDialect({ database }) };
}
