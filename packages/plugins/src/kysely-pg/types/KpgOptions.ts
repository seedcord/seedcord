import type { MigrationOptions } from './KpgMigration';
import type { Pool, PoolConfig } from 'pg';

/**
 * Options that describe where migrations live and how the migrator should
 * behave.
 */
export interface KpgMigrationsOptions {
    /** Directory path, single file path, or array of migration files */
    readonly path: string | string[];
    /** Allow running migrations even if new ones are inserted out of order */
    readonly allowUnorderedMigrations?: boolean;
    /** Custom table name used to track executed migrations */
    readonly migrationTableName?: string;
    /** Custom lock table name used by the migrator */
    readonly migrationLockTableName?: string;
    /** Schema that contains the migration bookkeeping tables */
    readonly migrationTableSchema?: string;
    /** Comparator that determines execution order for migrations */
    readonly nameComparator?: (nameA: string, nameB: string) => number;
    /** Behavior when the plugin connects. `true`/`undefined` runs to latest. */
    readonly onStartup?: boolean | MigrationOptions;
}

/**
 * Configuration options for Postgres connection and service discovery.
 */
export interface KpgOptions {
    /** Directory containing service classes. Make sure file(s)/folder(s) are built to `.js` in dist and aren't merged into a single file. */
    readonly dir: string;
    /** Migration settings */
    readonly migrations: KpgMigrationsOptions;
    /** Optional existing Pool instance or configuration overrides */
    readonly pool?: Pool | PoolConfig;
    /** Optional connection string used when a pool config is provided */
    readonly connectionString?: string;
    /** Optional SQL statements executed for each new connection */
    readonly onConnectSQL?: string[];
    /** Force using insecure SSL*/
    readonly forceInsecureSSL?: boolean;
}
