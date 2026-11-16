import type { SqliteDatabase } from 'kysely';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

// justified: Kysely only passes values it compiled from a query, which SQLite accepts
const asValues = (parameters: readonly unknown[]): SQLInputValue[] => parameters as SQLInputValue[];

/**
 * Wraps a `node:sqlite` database for Kysely's `SqliteDialect`.
 *
 * Kysely passes a query's parameters as one array and reads a `reader` flag off each statement. `node:sqlite` takes
 * the parameters spread out, and its statements don't carry that flag. This wrapper spreads the array and sets the
 * flag from the statement's columns.
 *
 * @example
 * ```ts
 * import { DatabaseSync } from 'node:sqlite';
 * import { SqliteDialect } from 'kysely';
 *
 * seedcord.attach('db', Kysely, {
 *     dialect: () => new SqliteDialect({ database: nodeSqlite(new DatabaseSync('bot.db')) }),
 *     dir: './services',
 *     migrations: { dir: './migrations' }
 * });
 * ```
 */
export function nodeSqlite(database: DatabaseSync): SqliteDatabase {
    return {
        close: () => database.close(),
        prepare(sql) {
            const statement = database.prepare(sql);
            return {
                reader: statement.columns().length > 0,
                all: (parameters) => statement.all(...asValues(parameters)),
                run: (parameters) => statement.run(...asValues(parameters)),
                iterate: (parameters) => statement.iterate(...asValues(parameters))
            };
        }
    };
}
