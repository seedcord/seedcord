import path from 'node:path';
import { inspect } from 'node:util';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined, importFiles } from '@seedcord/utils';
import { Migrator, NO_MIGRATIONS } from 'kysely/migration';

import type { MigrationManagerContext, MigrationOptions, StepMigrationOptions } from './types/KyselyMigration';
import type {
    Migration,
    MigrationInfo,
    MigrationProvider,
    MigrationResult,
    MigrationResultSet
} from 'kysely/migration';

interface MigrationFile {
    name: string;
    file: string;
    migration: Migration;
}

// kysely's FileMigrationProvider strips the extension the same way
function migrationName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
}

// kysely's FileMigrationProvider checks the default export first too
function migrationIn(imported: Record<string, unknown>): Migration | undefined {
    if (isMigration(imported.default)) return imported.default;
    return isMigration(imported) ? imported : undefined;
}

function isMigration(value: unknown): value is Migration {
    return typeof value === 'object' && value !== null && 'up' in value && typeof value.up === 'function';
}

/**
 * @sealed
 */
export class KyselyMigrationManager {
    constructor(private readonly ctx: MigrationManagerContext) {}

    public async migrate(options?: MigrationOptions): Promise<void> {
        const { target, direction = 'latest', steps } = options ?? {};

        if (target !== undefined) {
            const label = target === NO_MIGRATIONS ? 'NO_MIGRATIONS' : target;
            await this.runMigration((migrator) => migrator.migrateTo(target), `Migrating to ${paint.amber(label)}...`);
            return;
        }

        switch (direction) {
            case 'latest': {
                await this.runMigration((migrator) => migrator.migrateToLatest());
                return;
            }
            case 'up':
            case 'down': {
                const stepCount = steps ?? 1;
                if (!Number.isSafeInteger(stepCount) || stepCount < 0) {
                    throw new SeedcordRangeError(SeedcordErrorCode.PluginKyselyInvalidStepCount, [stepCount]);
                }

                if (stepCount === 0) {
                    this.logMigrationResults([]);
                    return;
                }

                const runner =
                    direction === 'up'
                        ? (migrator: Migrator) => migrator.migrateUp()
                        : (migrator: Migrator) => migrator.migrateDown();
                await this.runStepwise(stepCount, direction, runner);
                return;
            }
            default: {
                throw new SeedcordTypeError(SeedcordErrorCode.PluginKyselyUnknownDirection, [direction]);
            }
        }
    }

    public async migrateUp(options?: StepMigrationOptions): Promise<void> {
        if (options?.steps === undefined) {
            await this.migrate({ direction: 'up' });
            return;
        }

        await this.migrate({ direction: 'up', steps: options.steps });
    }

    public async migrateDown(options?: StepMigrationOptions): Promise<void> {
        if (options?.steps === undefined) {
            await this.migrate({ direction: 'down' });
            return;
        }

        await this.migrate({ direction: 'down', steps: options.steps });
    }

    public async listMigrations(): Promise<readonly MigrationInfo[]> {
        const migrator = await this.createMigrator();
        return migrator.getMigrations();
    }

    private async runMigration(
        runner: (migrator: Migrator) => Promise<MigrationResultSet>,
        runningMessage = 'Running migrations...'
    ): Promise<void> {
        this.ctx.logger.debug(paint.mute('Preparing migrations...'));
        const migrator = await this.createMigrator();

        this.ctx.logger.info(paint.mute(runningMessage));
        const { error, results } = await runner(migrator);

        this.logMigrationResults(results ?? []);

        if (error) {
            this.handleMigrationError(error);
        }
    }

    private async runStepwise(
        steps: number,
        direction: 'up' | 'down',
        runner: (migrator: Migrator) => Promise<MigrationResultSet>
    ): Promise<void> {
        this.ctx.logger.debug(paint.mute('Preparing migrations...'));
        const migrator = await this.createMigrator();

        const directionLabel = direction === 'up' ? 'Running' : 'Reverting';
        const countLabel = steps === 1 ? 'one migration' : `${paint.amber(String(steps))} migrations`;
        this.ctx.logger.info(paint.mute(`${directionLabel} ${countLabel}...`));

        const aggregated: MigrationResult[] = [];
        let encounteredError: unknown;

        for (let index = 0; index < steps; index += 1) {
            const { error, results = [] } = await runner(migrator);
            aggregated.push(...results);

            if (error) {
                encounteredError = error;
                break;
            }

            if (!results.some((result) => result.status === 'Success')) {
                break;
            }
        }

        this.logMigrationResults(aggregated);

        if (encounteredError) {
            this.handleMigrationError(encounteredError);
        }
    }

    private async createMigrator(): Promise<Migrator> {
        const provider = await this.getMigrationProvider();
        const { config } = this.ctx;

        return new Migrator({
            db: this.ctx.db,
            provider,
            allowUnorderedMigrations: config.allowUnorderedMigrations ?? false,
            ...keepDefined(
                config,
                'migrationTableName',
                'migrationLockTableName',
                'migrationTableSchema',
                'nameComparator'
            )
        });
    }

    private async getMigrationProvider(): Promise<MigrationProvider> {
        const { dir } = this.ctx.config;
        this.ctx.logger.debug(paint.mute(`Loading migrations from ${paint.path(dir)}`));

        const files: MigrationFile[] = [];
        for await (const { relativePath, imported } of importFiles(dir)) {
            const migration = migrationIn(imported);
            if (!migration) {
                throw new SeedcordTypeError(SeedcordErrorCode.PluginKyselyInvalidMigrationModule, [relativePath]);
            }
            files.push({ name: migrationName(relativePath), file: relativePath, migration });
        }
        this.assertUniqueNames(files);
        this.logPreparedMigrations(files);

        const migrations = Object.fromEntries(files.map(({ name, migration }) => [name, migration]));
        return { getMigrations: () => Promise.resolve(migrations) };
    }

    private logPreparedMigrations(files: readonly MigrationFile[]): void {
        if (files.length === 0) return;

        this.ctx.logger.debug('Prepared migrations:');
        for (const { name } of files) {
            this.ctx.logger.utils.item(`${paint.mint(name)}`, 'debug');
        }
    }

    private logMigrationResults(results: readonly MigrationResult[]): void {
        if (results.length === 0) {
            this.ctx.logger.debug(paint.mute('No migrations executed.'));
            return;
        }

        this.ctx.logger.info('Migration results:');

        for (const result of results) {
            if (result.status === 'Success') {
                this.ctx.logger.info(`${paint.mint(paint.check)} ${paint.sky.bold(result.migrationName)}`);
                continue;
            }

            if (result.status === 'Error') {
                this.ctx.logger.error(`${paint.coral(paint.cross)} ${paint.sky.bold(result.migrationName)}`);
                continue;
            }

            this.ctx.logger.info(
                `${paint.amber('•')} ${paint.sky.bold(result.migrationName)} ${paint.mute('(skipped)')}`
            );
        }
    }

    private assertUniqueNames(files: readonly MigrationFile[]): void {
        const firstFileFor = new Map<string, string>();
        for (const { name, file } of files) {
            const first = firstFileFor.get(name);
            if (first !== undefined) {
                throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                    'migration',
                    name,
                    [paint.path(first), paint.path(file)],
                    "A migration's name is its file name without the folder or extension."
                ]);
            }
            firstFileFor.set(name, file);
        }
    }

    private handleMigrationError(error: unknown): never {
        const message = Error.isError(error) ? error.message : inspect(error);
        this.ctx.logger.error(`Migration failure: ${message}`);

        if (Error.isError(error)) {
            throw error;
        }

        throw new SeedcordError(SeedcordErrorCode.PluginKyselyNonErrorFailure, [message]);
    }
}
