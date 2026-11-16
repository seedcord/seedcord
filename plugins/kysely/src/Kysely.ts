import 'reflect-metadata';

import path from 'node:path';

import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { PluginServices } from '@seedcord/plugin-utils';
import { keepDefined } from '@seedcord/utils';
import { Envapter } from 'envapt';
import { Kysely as KyselyClient } from 'kysely';

import { KyselyServiceMetadataKey } from './decorators/RegisterKyselyService';
import { KyselyMigrationManager } from './KyselyMigrationManager';
import { KyselyService } from './KyselyService';

import type { KyselyServiceConstructor } from './KyselyService';
import type { KyselySchema } from './types/KyselyDatabase';
import type { MigrationOptions, StepMigrationOptions } from './types/KyselyMigration';
import type { KyselyOptions } from './types/KyselyOptions';
import type { KyselyServices } from './types/KyselyServices';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { Dialect } from 'kysely';
import type { MigrationInfo } from 'kysely/migration';

// the dialect's class name without its suffix, like Postgres for PostgresDialect
function labelOf(dialect: Dialect): string {
    return dialect.constructor.name.replace(/Dialect$/, '');
}

/**
 * Connects a bot to any database that Kysely has a dialect for.
 *
 * Opens the connection, applies migrations, and registers decorated services so the core can resolve them.
 */
export class Kysely extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    public static readonly id = '@seedcord/plugin-kysely';

    private client: KyselyClient<KyselySchema> | null = null;
    declare private label: string;
    private readonly serviceRegistry: PluginServices<KyselyServiceConstructor, KyselyServices>;

    /**
     * Map of all services registered with the plugin, keyed by their decorator name.
     *
     * @throws A **SeedcordError** if accessed before the plugin finishes initializing.
     */
    public get services(): KyselyServices {
        return this.serviceRegistry.map;
    }

    /**
     * The Kysely instance that the plugin built from your dialect.
     *
     * @throws A **SeedcordError** if accessed before the plugin connects.
     */
    public get connection(): KyselyClient<KyselySchema> {
        if (!this.client) {
            throw new SeedcordError(SeedcordErrorCode.PluginServicesNotReady, [this.constructor.name, 'connection']);
        }
        return this.client;
    }

    constructor(
        host: CoreBase,
        private readonly options: KyselyOptions
    ) {
        super(host, { runtime: 'server', dispose: keepDefined({ timeout: options.timeout }) });
        this.serviceRegistry = new PluginServices({
            pluginName: this.constructor.name,
            dir: options.dir,
            logger: this.logger,
            base: KyselyService,
            metadataKey: KyselyServiceMetadataKey,
            decorator: '@RegisterKyselyService',
            create: (Service) => new Service(this, this.core)
        });

        if (!Envapter.isDevelopment) return;

        super.registerCriticalFiles([path.posix.join(this.options.migrations.dir, '**')]);
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.serviceRegistry.handle(event);
    }

    /**
     * Connects through your dialect, runs any startup migrations, and loads decorated services.
     */
    public async init(): Promise<void> {
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
            await this.serviceRegistry.load();
        } catch (caught) {
            // the host skips dispose for a plugin whose init rejected so need to disconnect here
            await this.disconnect().catch((error: unknown) =>
                this.logger.error('failed to close the connection', error)
            );
            throw caught;
        }
    }

    public override async dispose(): Promise<void> {
        await this.disconnect();
    }

    public override codegen(): Promise<{ services: Record<string, KyselyServiceConstructor> }> {
        return this.serviceRegistry.codegen();
    }

    private async connect(): Promise<void> {
        let label = 'the database';
        try {
            const dialect = this.options.dialect();
            label = labelOf(dialect);
            this.label = label;
            this.client = new KyselyClient<KyselySchema>({ dialect, ...keepDefined(this.options.kysely ?? {}) });
            // kysely opens the driver on the first query
            await this.client.connection().execute(() => Promise.resolve());
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.PluginConnectionFailed, [label], { cause: err });
        }

        this.logger.info(`Connected to ${paint.sky.bold(label)}`);
    }

    private async disconnect(): Promise<void> {
        this.serviceRegistry.clear();

        const { client } = this;
        if (!client) return;
        this.client = null;

        this.logger.debug(paint.mute(`Closing the ${this.label} connection.`));
        await client.destroy().catch((err: unknown) => {
            throw new SeedcordError(SeedcordErrorCode.PluginDisconnectFailed, [this.label], { cause: err });
        });
        this.logger.info(paint.coral.bold(`Disconnected from ${this.label}`));
    }

    /**
     * Runs migrations using the supplied options.
     *
     * @param options - Target migration or direction overrides
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public async migrate(options?: MigrationOptions): Promise<void> {
        await this.migrations().migrate(options);
    }

    /**
     * Runs a single upwards migration step unless a custom count is provided.
     *
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public async migrateUp(options?: StepMigrationOptions): Promise<void> {
        await this.migrations().migrateUp(options);
    }

    /**
     * Runs a single downwards migration step unless a custom count is provided.
     *
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public async migrateDown(options?: StepMigrationOptions): Promise<void> {
        await this.migrations().migrateDown(options);
    }

    /**
     * Lists every migration registered with the manager along with its execution state.
     *
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public listMigrations(): Promise<readonly MigrationInfo[]> {
        return this.migrations().listMigrations();
    }

    /**
     * Lists unapplied migrations.
     *
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public async listPendingMigrations(): Promise<MigrationInfo[]> {
        const all = await this.listMigrations();
        return all.filter((m) => !m.executedAt);
    }

    private migrations(): KyselyMigrationManager {
        return new KyselyMigrationManager({
            db: this.connection,
            logger: this.logger,
            config: this.options.migrations
        });
    }
}
