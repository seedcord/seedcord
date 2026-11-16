import 'reflect-metadata';

import path from 'node:path';

import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { PluginServices } from '@seedcord/plugin-utils';
import { keepDefined } from '@seedcord/utils';
import { errorReason } from '@seedcord/utils/internal';
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

const FALLBACK_LABEL = 'database';

function labelOf(dialect: Dialect): string {
    // the constructor name of an anonymous dialect subclass is an empty string
    return dialect.constructor.name.replace(/Dialect$/, '') || FALLBACK_LABEL;
}

function connectionFailed(label: string, reason: string, cause: unknown, fix?: string): SeedcordError {
    return new SeedcordError(SeedcordErrorCode.PluginConnectionFailed, [label, reason, 'dialect', undefined, fix], {
        cause
    });
}

interface Session {
    readonly client: KyselyClient<KyselySchema>;
    readonly label: string;
}

/**
 * Connects a bot to any database that Kysely has a dialect for.
 *
 * Opens the connection, runs your migrations, and loads your service classes.
 */
export class Kysely extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    public static readonly id = '@seedcord/plugin-kysely';

    private session: Session | null = null;
    private readonly serviceRegistry: PluginServices<KyselyServiceConstructor, KyselyServices>;

    /**
     * Your services, keyed by the name you pass to `@RegisterKyselyService`.
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
        if (!this.session) {
            throw new SeedcordError(SeedcordErrorCode.PluginNotReady, [this.constructor.name, 'connection']);
        }
        return this.session.client;
    }

    constructor(
        host: CoreBase,
        private readonly options: KyselyOptions
    ) {
        super(host, { runtime: 'server', dispose: keepDefined({ timeout: options.timeout }) });
        this.serviceRegistry = new PluginServices({
            pluginName: this.constructor.name,
            path: options.path,
            logger: this.logger,
            base: KyselyService,
            metadataKey: KyselyServiceMetadataKey,
            decorator: '@RegisterKyselyService',
            create: (Service) => new Service(this, this.core)
        });

        if (!Envapter.isDevelopment) return;

        super.registerCriticalFiles([path.posix.join(this.options.migrations.path, '**')]);
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
            const { onStartup } = this.options.migrations;
            if (onStartup !== false) await this.migrate(typeof onStartup === 'object' ? onStartup : undefined);
            await this.serviceRegistry.load();
        } catch (caught) {
            // the host skips dispose for a plugin whose init rejected
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
        const dialect = this.dialect();
        const label = labelOf(dialect);
        const client = new KyselyClient<KyselySchema>({ dialect, ...keepDefined(this.options.kysely ?? {}) });
        // init()'s cleanup closes the client if the first connection fails
        this.session = { client, label };
        try {
            // kysely opens the driver on the first query
            await client.connection().execute(() => Promise.resolve());
        } catch (err) {
            throw connectionFailed(label, errorReason(err), err);
        }

        this.logger.info(`Connected to ${paint.sky.bold(label)}`);
    }

    private dialect(): Dialect {
        try {
            return this.options.dialect();
        } catch (err) {
            throw connectionFailed(
                FALLBACK_LABEL,
                `dialect() threw: ${errorReason(err)}`,
                err,
                'Fix the code inside dialect().'
            );
        }
    }

    private async disconnect(): Promise<void> {
        this.serviceRegistry.clear();

        const { session } = this;
        if (!session) return;
        this.session = null;

        this.logger.debug(paint.mute(`Closing the ${session.label} connection.`));
        await session.client.destroy().catch((err: unknown) => {
            throw new SeedcordError(SeedcordErrorCode.PluginDisconnectFailed, [session.label], { cause: err });
        });
        this.logger.info(paint.coral.bold(`Disconnected from ${session.label}`));
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
     * Runs the next pending migration, or `steps` of them.
     *
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public async migrateUp(options?: StepMigrationOptions): Promise<void> {
        await this.migrations().migrateUp(options);
    }

    /**
     * Reverts the last migration, or the last `steps` of them.
     *
     * @throws A **SeedcordError** if called before the plugin connects.
     */
    public async migrateDown(options?: StepMigrationOptions): Promise<void> {
        await this.migrations().migrateDown(options);
    }

    /**
     * Lists every migration and whether it has run.
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
