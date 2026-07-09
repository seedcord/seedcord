import type { KpgMigrationsOptions } from './KpgOptions';
import type { Logger } from '@seedcord/logger';
import type { Kysely } from 'kysely';
import type { Migration, NoMigrations } from 'kysely/migration';

/**
 * Type representing a migration function (either `up` or `down`).
 *
 * @internal
 */
type MigrationFn<TKey extends keyof Migration> = NonNullable<Migration[TKey]>;

/**
 * Module exporting both `up` and `down` migration functions.
 *
 * @internal
 */
export interface MigrationModule {
    up: MigrationFn<'up'>;
    down: MigrationFn<'down'>;
}

/**
 * Target migration identifier used to indicate no migrations should be run. Uses Kysely's built-in `NO_MIGRATIONS` constant.
 */
export type MigrationTarget = string | NoMigrations;

/**
 * Behavior configuration for migrations that should run automatically when a
 * database connection is established.
 */
export interface MigrationOptions {
    /**
     * Optional target migration to reach.
     *
     * @defaultValue the latest migration
     */
    readonly target?: MigrationTarget;
    /**
     * Direction to move along the migration timeline.
     *
     * @defaultValue `'latest'`
     */
    readonly direction?: 'latest' | 'up' | 'down';
    /** Number of steps to apply when direction is `up` or `down`. */
    readonly steps?: number;
}

/**
 * Behavior configuration for step-based migrations.
 */
export interface StepMigrationOptions {
    /** Number of steps to apply when direction is `up` or `down`. */
    readonly steps?: number | undefined;
}

/**
 * Context provided to the migration manager for performing migrations.
 *
 * @internal
 */
export interface MigrationManagerContext<Database extends object> {
    readonly db: Kysely<Database>;
    readonly logger: Logger;
    readonly config: KpgMigrationsOptions;
    readonly baseDir: string;
}
