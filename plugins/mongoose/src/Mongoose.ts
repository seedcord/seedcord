import 'reflect-metadata';

import { HmrModuleHandler } from '@seedcord/core/hmr';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { keepDefined } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';
import { Envapter } from 'envapt';
import mongoose from 'mongoose';

import { ModelMetadataKey } from './decorators/RegisterMongooseModel';
import { ServiceMetadataKey } from './decorators/RegisterMongooseService';
import { MongooseService } from './MongooseService';

import type { MongooseServiceConstructor } from './MongooseService';
import type { MongooseOptions } from './types/MongooseOptions';
import type { MongooseServices } from './types/MongooseServices';
import type { CoreBase } from '@seedcord/core';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { Mongoose as MongooseInstance } from 'mongoose';

interface MongooseArtifact {
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
    public readonly logger = new Logger('Mongoose');
    private isInitialised = false;
    private servicesReady = false;
    private readonly uri: string;

    private readonly _services: Record<string, unknown> = {};
    private readonly ownModels = new Set<string>();

    /**
     * Map of all loaded services. Keys come from `@RegisterMongooseService('key')`.
     *
     * @throws A **SeedcordError** if accessed before the plugin finishes initializing.
     */
    public get services(): MongooseServices {
        if (!this.servicesReady) {
            throw new SeedcordError(SeedcordErrorCode.PluginMongooseServicesNotReady);
        }
        return this._services;
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

        if (!Envapter.isDevelopment) return;
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: this.options.dir,
            isHandler: this.isServiceClass.bind(this),
            registerHandler: this.initializeService.bind(this),
            unregisterHandler: this.unregister.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    private getArtifacts(ctor: MongooseServiceConstructor): MongooseArtifact {
        const key = Reflect.getMetadata(ServiceMetadataKey, ctor) as string | undefined;
        const model = Reflect.getMetadata(ModelMetadataKey, ctor) as mongoose.Model<unknown> | undefined;
        return {
            ...(key && { key }),
            ...(model?.modelName && { modelName: model.modelName })
        };
    }

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    public async init(): Promise<void> {
        if (this.isInitialised) return;
        this.isInitialised = true;

        await this.connect();
        try {
            await this.loadServices();
        } catch (caught) {
            // the host skips dispose for a plugin whose init rejected so need to disconnect here
            await this.disconnect().catch((error: unknown) => this.logger.error('failed to disconnect', error));
            throw caught;
        }
        this.servicesReady = true;
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
                this.logger.info(chalk.green.bold(`Connected to MongoDB: ${chalk.magenta.bold(conn.connection.name)}`));
                return conn;
            })
            .catch((err) => {
                throw new SeedcordError(SeedcordErrorCode.PluginMongooseConnectionFailed, [this.options.name], {
                    cause: err
                });
            });
    }

    // scoped to this plugin's own models because the mongoose registry is global and shared with
    // everything else in the process
    private clearModels(): void {
        if (this.ownModels.size === 0) return;

        this.logger.debug(`Clearing ${this.ownModels.size} mongoose models`);
        for (const name of this.ownModels) mongoose.deleteModel(name);
        this.ownModels.clear();
    }

    private async disconnect(): Promise<void> {
        this.clearModels();

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- connect() may have failed before assigning, so there is nothing to disconnect
        if (!this.connection) return;

        await this.connection
            .disconnect()
            .then(() => this.logger.info(chalk.red.bold('Disconnected from MongoDB')))
            .catch((err) => {
                this.logger.error(`Could not disconnect from MongoDB: ${(err as Error).message}`);
                throw new SeedcordError(SeedcordErrorCode.PluginMongooseDisconnectFailed, { cause: err });
            });
    }

    private async loadServices(): Promise<void> {
        const servicesDir = this.options.dir;
        this.logger.info(chalk.bold(servicesDir));

        await traverseDirectory(servicesDir, (fullPath, rel, mod) => {
            for (const Service of Object.values(mod)) {
                if (!this.isServiceClass(Service)) {
                    continue;
                }

                this.initializeService(Service, rel);
                this.hmrHandler?.trackHandler(fullPath, Service);
            }
        });

        this.logger.utils.list(
            [`${chalk.magenta(Object.keys(this._services).length)} services`],
            chalk.bold.green('Loaded')
        );
    }

    private initializeService(Service: MongooseServiceConstructor, relativePath: string): void {
        const instance = new Service(this, this.core);
        const { modelName } = this.getArtifacts(Service);
        if (modelName) this.ownModels.add(modelName);
        this.logger.utils.registration(instance.constructor.name, relativePath);
    }

    private isServiceClass(obj: unknown): obj is MongooseServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof MongooseService &&
            Reflect.hasMetadata(ServiceMetadataKey, obj)
        );
    }

    /**
     * Register hook used by decorated services.
     *
     * @internal
     */
    _register(key: string, instance: unknown): void {
        this._services[key] = instance;
    }

    private unregister(Service: MongooseServiceConstructor, artifacts?: { key?: string; modelName?: string }): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(ServiceMetadataKey, Service) as string | undefined);
        const modelName =
            artifacts?.modelName ??
            (Reflect.getMetadata(ModelMetadataKey, Service) as mongoose.Model<unknown> | undefined)?.modelName;

        if (key && this._services[key]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- key is a runtime service name
            delete this._services[key];
        }

        if (modelName) {
            mongoose.deleteModel(modelName);
            this.ownModels.delete(modelName);
        }
    }
}
