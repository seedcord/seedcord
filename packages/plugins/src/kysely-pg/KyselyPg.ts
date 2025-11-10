import 'reflect-metadata';

import chalk from 'chalk';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, type PoolConfig } from 'pg';
import { keepDefined, Logger, Plugin, ShutdownPhase } from 'seedcord';

import { KpgDatabaseBootstrapper } from './KpgDatabaseBootstrapper';
import { KpgMigrationManager } from './KpgMigrationManager';
import { KpgServiceRegistry } from './KpgServiceRegistry';

import type { MigrationOptions, StepMigrationOptions } from './types/KpgMigration';
import type { KpgOptions } from './types/KpgOptions';
import type { AnyKpgService, KpgServiceKeys, KpgServices } from './types/KpgServices';
import type { MigrationInfo } from 'kysely';
import type { Core } from 'seedcord';

/**
 * Postgres plugin using Kysely.
 *
 * Handles setting up the connection pool, applying migrations, and
 * registering decorated services so they can be resolved from the core.
 */
export class KyselyPg<Database extends object> extends Plugin {
    public readonly logger = new Logger('KyselyPg');
    private isInitialised = false;

    /** Exposed Kysely instance once `init` completes. */
    declare public connection: Kysely<Database>;
    private pool: Pool | null = null;
    private migrationManager: KpgMigrationManager<Database> | null = null;
    private readonly serviceRegistry: KpgServiceRegistry<Database>;
    private readonly databaseBootstrapper: KpgDatabaseBootstrapper;
    private databaseName: string | null = null;

    /**
     * Map of all services registered with the plugin, keyed by their decorator name.
     */
    public get services(): KpgServices {
        return this.serviceRegistry.map;
    }

    constructor(
        public readonly core: Core,
        private readonly options: KpgOptions
    ) {
        super(core);
        this.serviceRegistry = new KpgServiceRegistry(this, core, this.logger);
        this.databaseBootstrapper = new KpgDatabaseBootstrapper(this.logger);
        this.core.shutdown.addTask(
            ShutdownPhase.ExternalResources,
            'stop-kyselypg',
            async () => await this.stop(),
            this.options.timeout
        );
    }

    /**
     * Connects to Postgres, runs any startup migrations, and loads decorated services.
     *
     * Safe to call multiple times; subsequent calls exit early.
     */
    public async init(): Promise<void> {
        if (this.isInitialised) return;
        this.isInitialised = true;

        await this.connect();

        const startupConfig = this.options.migrations.onStartup;
        if (startupConfig !== false) {
            if (startupConfig && typeof startupConfig !== 'boolean') {
                await this.migrate(startupConfig);
            } else {
                await this.migrate();
            }
        }
        await this.serviceRegistry.loadFromDirectory(this.options.dir);
    }

    /**
     * Tears down the connection pool and clears the migration manager reference.
     */
    public async stop(): Promise<void> {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        const pool = await this.resolvePool();
        this.pool = pool;

        this.registerOnConnectStatements(pool, this.options.onConnectSQL);

        try {
            await this.testPoolConnection(pool);

            this.connection = new Kysely<Database>({
                dialect: new PostgresDialect({ pool }),
                ...keepDefined(this.options.kysely ?? {})
            });

            this.migrationManager = new KpgMigrationManager({
                db: this.connection,
                logger: this.logger,
                config: this.options.migrations,
                baseDir: process.cwd()
            });

            const dbLabel = this.databaseName ?? 'unknown';
            this.logger.info(`Connected to Postgres database ${chalk.bold.magenta(dbLabel)}`);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.logger.error(`Could not connect to Postgres: ${error.message}`);
            throw error;
        }
    }

    private async disconnect(): Promise<void> {
        const pool = this.pool;
        if (!pool) return;

        this.pool = null;
        this.migrationManager = null;

        this.logger.info(chalk.gray('Closing Postgres pool.'));
        await pool.end().catch((err) => {
            this.logger.error(`Could not close pg pool: ${(err as Error).message}`);
        });
        this.logger.info(chalk.red.bold('Disconnected from Postgres'));
    }

    /**
     * Runs migrations using the supplied options or defaults to `latest`.
     *
     * @param options - Target migration or direction overrides
     */
    public async migrate(options?: MigrationOptions): Promise<void> {
        await this.getMigrationManager().migrate(options);
    }

    /**
     * Runs a single upwards migration step unless a custom count is provided.
     *
     * @param options - Optional configuration for step-based execution
     */
    public async migrateUp(options?: StepMigrationOptions): Promise<void> {
        await this.getMigrationManager().migrateUp(options);
    }

    /**
     * Runs a single downwards migration step unless a custom count is provided.
     *
     * @param options - Optional configuration for step-based execution
     */
    public async migrateDown(options?: StepMigrationOptions): Promise<void> {
        await this.getMigrationManager().migrateDown(options);
    }

    /**
     * Lists every migration the manager knows about along with its execution state.
     */
    public listMigrations(): Promise<readonly MigrationInfo[]> {
        return this.getMigrationManager().listMigrations();
    }

    /**
     * Lists unapplied migrations.
     */
    public async listPendingMigrations(): Promise<MigrationInfo[]> {
        const all = await this.listMigrations();
        return all.filter((m) => !m.executedAt);
    }

    private getMigrationManager(): KpgMigrationManager<Database> {
        if (this.migrationManager) return this.migrationManager;

        const manager = new KpgMigrationManager({
            db: this.connection,
            logger: this.logger,
            config: this.options.migrations,
            baseDir: process.cwd()
        });

        this.migrationManager = manager;
        return manager;
    }

    /**
     * Register hook used by decorated services.
     *
     * @internal
     */
    _register(key: KpgServiceKeys, instance: AnyKpgService): void {
        this.serviceRegistry.register(key, instance);
    }

    private async resolvePool(): Promise<Pool> {
        const { pool: providedPool, connectionString } = this.options;

        if (providedPool instanceof Pool) {
            this.logger.info(chalk.gray('Reusing provided Postgres pool instance.'));
            this.databaseName = this.databaseBootstrapper.resolveDatabaseFromPool(providedPool);
            return providedPool;
        }

        const baseConfig = this.createPoolConfig(providedPool, connectionString);
        await this.databaseBootstrapper.ensure(baseConfig);
        this.databaseName = this.databaseBootstrapper.resolveDatabaseName(baseConfig);

        this.logger.info(chalk.gray('Creating new Postgres pool.'));
        return new Pool(baseConfig);
    }

    private createPoolConfig(poolConfig?: PoolConfig, connectionString?: string): PoolConfig {
        const config: PoolConfig = poolConfig ? { ...poolConfig } : {};

        if (connectionString) {
            config.connectionString = connectionString;
        }

        if (this.options.forceInsecureSSL) {
            config.ssl = { rejectUnauthorized: false };
        }

        return config;
    }

    private registerOnConnectStatements(pool: Pool, statements?: string[]): void {
        if (!statements?.length) return;

        const queuedStatements = [...statements];
        pool.on('connect', (client) => {
            void (async () => {
                for (const sql of queuedStatements) {
                    await client.query(sql);
                }
            })();
        });
    }

    private async testPoolConnection(pool: Pool): Promise<void> {
        const client = await pool.connect();
        client.release();
    }
}
