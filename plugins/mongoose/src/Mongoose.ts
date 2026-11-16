import 'reflect-metadata';

import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { PluginServices } from '@seedcord/plugin-utils';
import { keepDefined } from '@seedcord/utils';
import { errorReason } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';
import mongoose from 'mongoose';

import { ServiceMetadataKey } from './decorators/RegisterMongooseService';
import { MongooseModels } from './MongooseModels';
import { MongooseService } from './MongooseService';

import type { MongooseServiceConstructor } from './MongooseService';
import type { MongooseOptions } from './types/MongooseOptions';
import type { MongooseServices } from './types/MongooseServices';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { Mongoose as MongooseInstance } from 'mongoose';
import type { Constructor } from 'type-fest';

/**
 * MongoDB integration plugin for Seedcord.
 *
 * Manages MongoDB connections, service loading, and provides type-safe
 * access to database services through service registration decorators.
 */
export class Mongoose extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    public static readonly id = '@seedcord/plugin-mongoose';

    private readonly uri: string;

    private client: MongooseInstance | null = null;
    private readonly models: MongooseModels;
    private readonly serviceRegistry: PluginServices<MongooseServiceConstructor, MongooseServices>;

    /**
     * Map of all loaded services. Keys come from `@RegisterMongooseService('key')`.
     *
     * @throws A **SeedcordError** if accessed before the plugin finishes initializing.
     */
    public get services(): MongooseServices {
        return this.serviceRegistry.map;
    }

    /**
     * The Mongoose instance that `mongoose.connect()` returned.
     *
     * @throws A **SeedcordError** if accessed before the plugin connects.
     */
    public get connection(): MongooseInstance {
        if (!this.client) {
            throw new SeedcordError(SeedcordErrorCode.PluginNotReady, [this.constructor.name, 'connection']);
        }
        return this.client;
    }

    constructor(
        host: CoreBase,
        private readonly options: MongooseOptions
    ) {
        super(host, { runtime: 'server', dispose: keepDefined({ timeout: options.timeout }) });
        this.uri = options.uri;
        this.models = new MongooseModels(this.logger);
        this.serviceRegistry = new PluginServices({
            pluginName: this.constructor.name,
            path: options.path,
            logger: this.logger,
            base: MongooseService,
            metadataKey: ServiceMetadataKey,
            decorator: '@RegisterMongooseService',
            create: (Service) => new Service(this, this.core, this.models.build(Service)),
            remove: (Service) => this.models.remove(Service)
        });
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.serviceRegistry.handle(event);
    }

    public async init(): Promise<void> {
        try {
            await this.connect();
            await this.serviceRegistry.load();
        } catch (caught) {
            // the host skips dispose for a plugin whose init rejected
            await this.disconnect().catch((error: unknown) => this.logger.error('failed to disconnect', error));
            throw caught;
        }
    }

    public override async dispose(): Promise<void> {
        await this.disconnect();
    }

    // the only type every service fits because a service on its own document type doesn't type-check against either service constructor type
    public override codegen(): Promise<{ services: Record<string, Constructor<object>> }> {
        return this.serviceRegistry.codegen();
    }

    private async connect(): Promise<void> {
        this.client = await mongoose
            .connect(this.uri, {
                dbName: this.options.name,
                ...(Envapter.isProduction && { tls: true, ssl: true }),
                ...keepDefined(this.options.connectionOptions ?? {})
            })
            .then((conn) => {
                this.logger.info(paint.mint.bold(`Connected to MongoDB: ${paint.sky.bold(conn.connection.name)}`));
                return conn;
            })
            .catch((err) => {
                throw new SeedcordError(
                    SeedcordErrorCode.PluginConnectionFailed,
                    ['MongoDB', errorReason(err), 'uri', this.options.name],
                    { cause: err }
                );
            });
    }

    private async disconnect(): Promise<void> {
        this.serviceRegistry.clear();
        this.models.clear();

        const { client } = this;
        if (!client) return;
        this.client = null;

        await client
            .disconnect()
            .then(() => this.logger.info(paint.coral.bold('Disconnected from MongoDB')))
            .catch((err: unknown) => {
                throw new SeedcordError(SeedcordErrorCode.PluginDisconnectFailed, ['MongoDB'], { cause: err });
            });
    }
}
