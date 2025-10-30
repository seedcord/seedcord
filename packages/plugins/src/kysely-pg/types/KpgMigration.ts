import type { KpgMigrationsOptions } from './KpgOptions';
import type { Kysely, Migration, NO_MIGRATIONS } from 'kysely';
import type { Logger } from 'seedcord';

/**
 * Type representing a migration function (either `up` or `down`).
 *
 * @internal
 */
export type MigrationFn<TKey extends keyof Migration> = NonNullable<Migration[TKey]>;

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
 *
 * @internal
 */
export type MigrationTarget = string | typeof NO_MIGRATIONS;

/**
 * Behavior configuration for migrations that should run automatically when a
 * database connection is established.
 */
export interface MigrationOptions {
    /** Optional target migration to reach. Defaults to latest if omitted. */
    readonly target?: MigrationTarget;
    /** Direction to move along the migration timeline. Defaults to `latest`. */
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
