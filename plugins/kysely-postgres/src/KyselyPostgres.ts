import 'reflect-metadata';

import { HmrModuleHandler } from '@seedcord/core/hmr';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import chalk from 'chalk';
import { Envapter } from 'envapt';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, type PoolConfig, type PoolClient } from 'pg';

import { KyselyServiceMetadataKey } from './decorators/RegisterKyselyService';
import { KyselyMigrationManager } from './KyselyMigrationManager';
import { KyselyServiceRegistry } from './KyselyServiceRegistry';
import { PostgresDatabaseBootstrapper } from './PostgresDatabaseBootstrapper';

import type { KyselyServiceConstructor } from './KyselyService';
import type { KyselySchema } from './types/KyselyDatabase';
import type { MigrationOptions, StepMigrationOptions } from './types/KyselyMigration';
import type { KyselyOptions } from './types/KyselyOptions';
import type { KyselyServices } from './types/KyselyServices';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { MigrationInfo } from 'kysely/migration';

export interface KyselyArtifact {
    key?: string;
}

/**
 * Postgres plugin using Kysely.
 *
 * Sets up the connection pool, applies migrations, and registers decorated
 * services so the core can resolve them.
 */
export class KyselyPostgres extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    private isInitialised = false;
    private servicesReady = false;
    private inFlight: Promise<void> | null = null;

    /** Exposed Kysely instance once `init` completes. */
    declare public connection: Kysely<KyselySchema>;
    private pool: Pool | null = null;
    private onConnectHandler: ((client: PoolClient) => void) | null = null;
    private migrationManager: KyselyMigrationManager | null = null;
    private readonly serviceRegistry: KyselyServiceRegistry;
    private readonly databaseBootstrapper: PostgresDatabaseBootstrapper;
    private databaseName: string | null = null;
    private readonly hmrHandler?: HmrModuleHandler<KyselyServiceConstructor, void, KyselyArtifact>;

    /**
     * Map of all services registered with the plugin, keyed by their decorator name.
     *
     * @throws A **SeedcordError** if accessed before the plugin finishes initializing.
     */
    public get services(): KyselyServices {
        if (!this.servicesReady) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyServicesNotReady);
        }
        return this.serviceRegistry.map;
    }

    constructor(
        host: CoreBase,
        private readonly options: KyselyOptions
    ) {
        super(host, { dispose: keepDefined({ timeout: options.timeout }) });
        this.serviceRegistry = new KyselyServiceRegistry(this, this.core, this.logger);
        this.databaseBootstrapper = new PostgresDatabaseBootstrapper(this.logger);

        if (!Envapter.isDevelopment) return;

        const relPaths = this.options.migrations.path;
        super.registerCriticalFiles(Array.isArray(relPaths) ? relPaths : [relPaths]);

        this.hmrHandler = new HmrModuleHandler({
            handlersDir: this.options.dir,
            isHandler: this.serviceRegistry.isServiceClass.bind(this.serviceRegistry),
            registerHandler: this.serviceRegistry.initializeService.bind(this.serviceRegistry),
            unregisterHandler: this.serviceRegistry.unregister.bind(this.serviceRegistry),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    private getArtifacts(ctor: KyselyServiceConstructor): KyselyArtifact {
        const key = Reflect.getMetadata(KyselyServiceMetadataKey, ctor) as string | undefined;
        return key ? { key } : {};
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    /**
     * Connects to Postgres, runs any startup migrations, and loads decorated services.
     *
     * Safe to call multiple times, subsequent calls exit early.
     */
    public init(): Promise<void> {
        if (this.isInitialised) return Promise.resolve();
        // racing callers share one attempt, and clearing it on settle means the next call starts a fresh one
        this.inFlight ??= this.runInit().finally(() => {
            this.inFlight = null;
        });
        return this.inFlight;
    }

    private async runInit(): Promise<void> {
        try {
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
        } catch (caught) {
            // the host skips dispose for a plugin whose init rejected so need to disconnect here
            await this.disconnect().catch((error: unknown) => this.logger.error('failed to close the pool', error));
            throw caught;
        }
        this.servicesReady = true;
        this.isInitialised = true;
    }

    public override async dispose(): Promise<void> {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        const pool = await this.resolvePool();
        this.pool = pool;

        this.registerOnConnectStatements(pool, this.options.onConnectSQL);

        try {
            await this.testPoolConnection(pool);

            this.connection = new Kysely<KyselySchema>({
                dialect: new PostgresDialect({ pool }),
                ...keepDefined(this.options.kysely ?? {})
            });

            this.migrationManager = new KyselyMigrationManager({
                db: this.connection,
                logger: this.logger,
                config: this.options.migrations,
                baseDir: process.cwd()
            });

            const dbLabel = this.databaseName ?? 'unknown';
            this.logger.info(`Connected to Postgres database ${chalk.bold.magenta(dbLabel)}`);
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyConnectionFailed, [this.databaseName ?? undefined], {
                cause: err
            });
        }
    }

    private async disconnect(): Promise<void> {
        this.serviceRegistry.clear();
        this.servicesReady = false;
        this.isInitialised = false;

        const pool = this.pool;
        if (!pool) return;

        if (this.onConnectHandler) {
            pool.removeListener('connect', this.onConnectHandler);
            this.onConnectHandler = null;
        }

        this.pool = null;
        this.migrationManager = null;

        this.logger.debug(chalk.gray('Closing Postgres pool.'));
        await pool.end().catch((err: unknown) => {
            const error = Error.isError(err) ? err : new Error(String(err));
            this.logger.error(`Could not close pg pool: ${error.message}`);
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyDisconnectFailed, { cause: err });
        });
        this.logger.info(chalk.red.bold('Disconnected from Postgres'));
    }

    /**
     * Runs migrations using the supplied options.
     *
     * @param options - Target migration or direction overrides
     */
    public async migrate(options?: MigrationOptions): Promise<void> {
        await this.getMigrationManager().migrate(options);
    }

    /**
     * Runs a single upwards migration step unless a custom count is provided.
     */
    public async migrateUp(options?: StepMigrationOptions): Promise<void> {
        await this.getMigrationManager().migrateUp(options);
    }

    /**
     * Runs a single downwards migration step unless a custom count is provided.
     */
    public async migrateDown(options?: StepMigrationOptions): Promise<void> {
        await this.getMigrationManager().migrateDown(options);
    }

    /**
     * Lists every migration registered with the manager along with its execution state.
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

    private getMigrationManager(): KyselyMigrationManager {
        if (this.migrationManager) return this.migrationManager;

        const manager = new KyselyMigrationManager({
            db: this.connection,
            logger: this.logger,
            config: this.options.migrations,
            baseDir: process.cwd()
        });

        this.migrationManager = manager;
        return manager;
    }

    /** @internal */
    _register(key: string, instance: unknown): void {
        this.serviceRegistry.register(key, instance);
    }

    /**
     * Tracks a service file with the HMR handler so dev reloads can swap it. No-op outside dev.
     *
     * @internal Exposes the dev-only HMR handler to {@link KyselyServiceRegistry}.
     */
    public trackServiceFile(filePath: string, ctor: KyselyServiceConstructor): void {
        this.hmrHandler?.trackHandler(filePath, ctor);
    }

    private async resolvePool(): Promise<Pool> {
        const { pool: providedPool, connectionString } = this.options;

        if (providedPool instanceof Pool) {
            this.logger.debug(chalk.gray('Reusing provided Postgres pool instance.'));
            this.databaseName = this.databaseBootstrapper.resolveDatabaseFromPool(providedPool);
            return providedPool;
        }

        const baseConfig = this.createPoolConfig(providedPool, connectionString);
        await this.databaseBootstrapper.ensure(baseConfig);
        this.databaseName = this.databaseBootstrapper.resolveDatabaseName(baseConfig);

        this.logger.debug(chalk.gray('Creating new Postgres pool.'));
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
        const handler = (client: PoolClient): void => {
            void (async () => {
                for (const sql of queuedStatements) {
                    await client.query(sql);
                }
            })().catch((err) => this.logger.error('Failed to run onConnect SQL', err));
        };

        this.onConnectHandler = handler;
        pool.on('connect', handler);
    }

    private async testPoolConnection(pool: Pool): Promise<void> {
        const client = await pool.connect();
        client.release();
    }
}
