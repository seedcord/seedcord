import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspect } from 'node:util';

import { keepDefined } from '@seedcord/utils';
import chalk from 'chalk';
import { FileMigrationProvider, Migrator, NO_MIGRATIONS } from 'kysely';
import { SeedcordError, SeedcordErrorCode, SeedcordRangeError } from 'seedcord';

import type {
    MigrationManagerContext,
    MigrationModule,
    MigrationOptions,
    StepMigrationOptions
} from './types/KpgMigration';
import type { Migration, MigrationInfo, MigrationProvider, MigrationResult, MigrationResultSet } from 'kysely';
import type { Stats } from 'node:fs';

/**
 * Migration tooling for KyselyPg.
 */
export class KpgMigrationManager<Database extends object> {
    constructor(private readonly ctx: MigrationManagerContext<Database>) {}

    public async migrate(options?: MigrationOptions): Promise<void> {
        const { target, direction = 'latest', steps } = options ?? {};

        if (typeof target !== 'undefined') {
            const label = target === NO_MIGRATIONS ? 'NO_MIGRATIONS' : target;
            await this.runMigration((migrator) => migrator.migrateTo(target), `Migrating to ${chalk.yellow(label)}...`);
            return;
        }

        switch (direction) {
            case 'latest':
                await this.runMigration((migrator) => migrator.migrateToLatest());
                return;
            case 'up':
            case 'down': {
                const stepCount = steps ?? 1;
                if (!Number.isInteger(stepCount) || stepCount < 0) {
                    throw new SeedcordRangeError(SeedcordErrorCode.PluginKpgInvalidStepCount);
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
            default:
                throw new SeedcordError(SeedcordErrorCode.PluginKpgUnknownDirection, [direction]);
        }
    }

    public async migrateUp(options?: StepMigrationOptions): Promise<void> {
        if (typeof options?.steps === 'undefined') {
            await this.migrate({ direction: 'up' });
            return;
        }

        await this.migrate({ direction: 'up', steps: options.steps });
    }

    public async migrateDown(options?: StepMigrationOptions): Promise<void> {
        if (typeof options?.steps === 'undefined') {
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
        this.ctx.logger.info(chalk.gray('Preparing migrations...'));
        const migrator = await this.createMigrator();

        this.ctx.logger.info(chalk.gray(runningMessage));
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
        this.ctx.logger.info(chalk.gray('Preparing migrations...'));
        const migrator = await this.createMigrator();

        const directionLabel = direction === 'up' ? 'Running' : 'Reverting';
        const countLabel = steps === 1 ? 'one migration' : `${chalk.yellow(String(steps))} migrations`;
        this.ctx.logger.info(chalk.gray(`${directionLabel} ${countLabel}...`));

        const aggregated: MigrationResult[] = [];
        let encounteredError: unknown;

        for (let index = 0; index < steps; index += 1) {
            const { error, results } = await runner(migrator);

            if (results?.length) {
                aggregated.push(...results);
            }

            if (error) {
                encounteredError = error;
                break;
            }

            if (!results?.length) {
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
            ...keepDefined(config, 'migrationTableName', 'migrationLockTableName', 'migrationTableSchema')
        });
    }

    private async getMigrationProvider(): Promise<MigrationProvider> {
        const { path: target } = this.ctx.config;
        const resolvedTarget = Array.isArray(target)
            ? target.map((entry) => this.resolvePath(entry))
            : this.resolvePath(target);

        if (Array.isArray(resolvedTarget)) {
            this.logMigrationFiles(resolvedTarget);
            return this.createModuleProvider(resolvedTarget);
        }

        let migrationStat: Stats | undefined;
        try {
            migrationStat = await fs.stat(resolvedTarget);
        } catch {
            migrationStat = undefined;
        }

        if (migrationStat?.isDirectory()) {
            const directory = this.relativePath(resolvedTarget);
            this.ctx.logger.info(chalk.gray(`Loading migrations directory ${chalk.yellow(directory)}`));
            return new FileMigrationProvider({ fs, path, migrationFolder: resolvedTarget });
        }

        if (migrationStat?.isFile() ?? true) {
            this.logMigrationFiles([resolvedTarget]);
            return this.createModuleProvider([resolvedTarget]);
        }

        const label = Array.isArray(target) ? target.join(', ') : target;
        throw new SeedcordError(SeedcordErrorCode.PluginKpgUnresolvedMigrationsPath, [label]);
    }

    private async createModuleProvider(files: string[]): Promise<MigrationProvider> {
        if (files.length === 0) {
            throw new SeedcordError(SeedcordErrorCode.PluginKpgNoMigrationFiles);
        }

        const comparator =
            this.ctx.config.nameComparator ?? ((nameA: string, nameB: string) => nameA.localeCompare(nameB));

        const entries = await Promise.all(
            files.map(async (filePath) => {
                const moduleUrl = pathToFileURL(filePath).href;
                const mod: unknown = await import(moduleUrl);

                if (!this.isMigrationModule(mod)) {
                    throw new SeedcordError(SeedcordErrorCode.PluginKpgInvalidMigrationModule, [filePath]);
                }

                const { up, down } = mod;

                const name = path.basename(filePath);

                const migration: Migration = {
                    async up(db) {
                        await up(db);
                    },
                    async down(db) {
                        await down(db);
                    }
                };

                return [name, migration] as const;
            })
        );

        const sorted = entries.sort(([a], [b]) => comparator(a, b));
        this.logPreparedMigrations(sorted);

        return {
            getMigrations: () => Promise.resolve(Object.fromEntries(sorted))
        } satisfies MigrationProvider;
    }

    private logMigrationFiles(files: readonly string[]): void {
        if (!files.length) return;

        this.ctx.logger.info('Loading migration file(s):');
        for (const file of files) {
            this.ctx.logger.info(`→ ${chalk.yellow(this.relativePath(file))}`);
        }
    }

    private logPreparedMigrations(entries: readonly (readonly [string, Migration])[]): void {
        if (!entries.length) return;

        this.ctx.logger.info('Prepared migrations:');
        for (const [name] of entries) {
            this.ctx.logger.info(`→ ${chalk.green(name)}`);
        }
    }

    private logMigrationResults(results: readonly MigrationResult[]): void {
        if (!results.length) {
            this.ctx.logger.info(chalk.gray('No migrations executed.'));
            return;
        }

        this.ctx.logger.info('Migration results:');

        for (const result of results) {
            if (result.status === 'Success') {
                this.ctx.logger.info(`${chalk.green('✓')} ${chalk.bold(result.migrationName)}`);
                continue;
            }

            if (result.status === 'Error') {
                this.ctx.logger.error(`${chalk.red('✗')} ${chalk.bold(result.migrationName)}`);
                continue;
            }

            this.ctx.logger.info(`${chalk.yellow('•')} ${chalk.bold(result.migrationName)} ${chalk.gray('(skipped)')}`);
        }
    }

    private relativePath(filePath: string): string {
        const relative = path.relative(this.ctx.baseDir, filePath);
        return relative.startsWith('..') ? filePath : relative;
    }

    private resolvePath(target: string): string {
        if (path.isAbsolute(target)) return target;
        return path.resolve(this.ctx.baseDir, target);
    }

    private handleMigrationError(error: unknown): never {
        const message = error instanceof Error ? error.message : inspect(error);
        this.ctx.logger.error(`Migration failure: ${message}`);

        if (error instanceof Error) {
            throw error;
        }

        throw new SeedcordError(SeedcordErrorCode.PluginKpgNonErrorFailure, [message]);
    }

    private isMigrationModule(value: unknown): value is MigrationModule {
        if (!value || typeof value !== 'object') return false;
        if (!('up' in value) || !('down' in value)) return false;

        const { up, down } = value as { up: unknown; down: unknown };

        return typeof up === 'function' && typeof down === 'function';
    }
}
