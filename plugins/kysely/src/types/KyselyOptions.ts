import type { MigrationOptions } from './KyselyMigration';
import type { Dialect, KyselyConfig } from 'kysely';
import type { Except } from 'type-fest';

/**
 * Options that describe where migrations live and how the migrator should
 * behave.
 */
export interface KyselyMigrationsOptions {
    /** Folder holding your migration files, subfolders included. A relative path resolves against `root` from `seedcord.config.ts`. */
    readonly path: string;
    /** Allow running migrations even if new ones are inserted out of order */
    readonly allowUnorderedMigrations?: boolean;
    /** Custom table name used to track executed migrations */
    readonly migrationTableName?: string;
    /** Custom lock table name used by the migrator */
    readonly migrationLockTableName?: string;
    /** Schema that contains the migration bookkeeping tables */
    readonly migrationTableSchema?: string;
    /** Orders recorded migrations that ran at the same timestamp. Defaults to `localeCompare`. Pending migrations always run sorted by name. */
    readonly nameComparator?: (nameA: string, nameB: string) => number;
    /** Behavior when the plugin connects. `true`/`undefined` runs to latest. */
    readonly onStartup?: boolean | MigrationOptions;
}

/**
 * Options for the Kysely plugin's connection, migrations and services.
 */
export interface KyselyOptions {
    /** Folder holding your service classes, subfolders included. A relative path resolves against `root` from `seedcord.config.ts`. */
    readonly path: string;
    /** Migration settings */
    readonly migrations: KyselyMigrationsOptions;
    /**
     * Builds the Kysely dialect for your database. The plugin calls it in `init()` and never while
     * `seedcord build` or `seedcord codegen` loads your bot.
     */
    readonly dialect: () => Dialect;
    /** Any other Kysely config, like `log` or `plugins` */
    readonly kysely?: Except<KyselyConfig, 'dialect'>;
    /**
     * How long closing the connection may take during shutdown, in milliseconds.
     *
     * @defaultValue `10_000`
     */
    readonly timeout?: number;
}
