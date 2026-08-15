import 'reflect-metadata';

import { HmrModuleHandler } from '@seedcord/core/hmr';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { paint } from '@seedcord/logger';
import { keepDefined } from '@seedcord/utils';
import { Envapter } from 'envapt';
import mongoose from 'mongoose';

import { MongooseServiceRegistry } from './MongooseServiceRegistry';

import type { MongooseServiceConstructor } from './MongooseService';
import type { MongooseOptions } from './types/MongooseOptions';
import type { MongooseServices } from './types/MongooseServices';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { Mongoose as MongooseInstance } from 'mongoose';

export interface MongooseArtifact {
    key?: string;
    modelName?: string;
}

/**
 * MongoDB integration plugin for Seedcord.
 *
 * Manages MongoDB connections, service loading, and provides type-safe
 * access to database services through service registration decorators.
 */
export class Mongoose extends Plugin<{ transport: 'any'; runtime: 'server' }> {
    private isInitialised = false;
    private servicesReady = false;
    private inFlight: Promise<void> | null = null;
    private readonly uri: string;

    private readonly serviceRegistry: MongooseServiceRegistry;

    /**
     * Map of all loaded services. Keys come from `@RegisterMongooseService('key')`.
     *
     * @throws A **SeedcordError** if accessed before the plugin finishes initializing.
     */
    public get services(): MongooseServices {
        if (!this.servicesReady) {
            throw new SeedcordError(SeedcordErrorCode.PluginMongooseServicesNotReady);
        }
        return this.serviceRegistry.map;
    }

    /** Exposed Mongoose instance once `init` completes. */
    declare public connection: MongooseInstance;
    private readonly hmrHandler?: HmrModuleHandler<MongooseServiceConstructor, void, MongooseArtifact>;

    constructor(
        host: CoreBase,
        private readonly options: MongooseOptions
    ) {
        super(host, { dispose: keepDefined({ timeout: options.timeout }) });
        this.uri = options.uri;
        this.serviceRegistry = new MongooseServiceRegistry(this, this.core, this.logger);

        if (!Envapter.isDevelopment) return;
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: this.options.dir,
            isHandler: this.serviceRegistry.isServiceClass.bind(this.serviceRegistry),
            registerHandler: this.serviceRegistry.initializeService.bind(this.serviceRegistry),
            unregisterHandler: this.serviceRegistry.unregister.bind(this.serviceRegistry),
            getArtifacts: this.serviceRegistry.getArtifacts.bind(this.serviceRegistry),
            logger: this.logger
        });
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    public init(): Promise<void> {
        if (this.isInitialised) return Promise.resolve();
        // racing callers share one attempt, and clearing it on settle lets the next call start fresh
        this.inFlight ??= this.runInit().finally(() => {
            this.inFlight = null;
        });
        return this.inFlight;
    }

    private async runInit(): Promise<void> {
        try {
            await this.connect();
            await this.loadServices();
        } catch (caught) {
            // the host skips dispose for a plugin whose init rejected
            await this.disconnect().catch((error: unknown) => this.logger.error('failed to disconnect', error));
            throw caught;
        }
        this.servicesReady = true;
        this.isInitialised = true;
    }

    public override async dispose(): Promise<void> {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        this.connection = await mongoose
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
                throw new SeedcordError(SeedcordErrorCode.PluginMongooseConnectionFailed, [this.options.name], {
                    cause: err
                });
            });
    }

    private async disconnect(): Promise<void> {
        this.serviceRegistry.clear();
        this.servicesReady = false;
        this.isInitialised = false;

        this.serviceRegistry.clearModels();

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- connect() may have failed before assigning, so there is nothing to disconnect
        if (!this.connection) return;

        await this.connection
            .disconnect()
            .then(() => this.logger.info(paint.coral.bold('Disconnected from MongoDB')))
            .catch((err: unknown) => {
                const error = Error.isError(err) ? err : new Error(String(err));
                this.logger.error(`Could not disconnect from MongoDB: ${error.message}`);
                throw new SeedcordError(SeedcordErrorCode.PluginMongooseDisconnectFailed, { cause: err });
            });
    }

    private async loadServices(): Promise<void> {
        await this.serviceRegistry.loadFromDirectory(this.options.dir, (fullPath, Service) => {
            this.hmrHandler?.trackHandler(fullPath, Service);
        });
    }

    /** @internal */
    _register(key: string, instance: unknown): void {
        this.serviceRegistry.register(key, instance);
    }
}
