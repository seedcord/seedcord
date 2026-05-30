import 'reflect-metadata';

import { SeedcordError } from '@seedcord/services/internal';
import chalk from 'chalk';
import { Envapter } from 'envapt';
import mongoose from 'mongoose';
import {
    HmrModuleHandler,
    keepDefined,
    Logger,
    Plugin,
    SeedcordErrorCode,
    ShutdownPhase,
    traverseDirectory
} from 'seedcord';

import { ModelMetadataKey } from './decorators/RegisterMongoModel';
import { ServiceMetadataKey } from './decorators/RegisterMongoService';
import { MongoService } from './MongoService';

import type { MongoServiceConstructor } from './MongoService';
import type { MongoOptions } from './types/MongoOptions';
import type { MongoServices } from './types/MongoServices';
import type { HmrUpdateEvent } from '@seedcord/cli';
import type { Mongoose } from 'mongoose';
import type { Core } from 'seedcord';

interface MongoArtifact {
    key?: string;
    modelName?: string;
}

/**
 * MongoDB integration plugin for Seedcord.
 *
 * Manages MongoDB connections, service loading, and provides type-safe
 * access to database services through service registration decorators.
 */
export class Mongo extends Plugin {
    public readonly logger = new Logger('Mongo');
    private isInitialised = false;
    private servicesReady = false;
    private readonly uri: string;

    private readonly _services: Record<string, unknown> = {};

    /**
     * Map of all loaded services. Keys come from `@RegisterMongoService('key')`.
     *
     * @throws A {@link SeedcordError} if accessed before the plugin finishes initializing (e.g. from
     * a plugin that starts in an earlier phase).
     */
    public get services(): MongoServices {
        if (!this.servicesReady) {
            throw new SeedcordError(SeedcordErrorCode.PluginMongoServicesNotReady);
        }
        // MongoServices is augmented per-consumer via declaration merging; the registry holds the
        // instances opaquely and exposes the generated map shape at this public boundary.
        return this._services;
    }

    /** Exposed Mongoose instance once `init` completes. */
    declare public connection: Mongoose;
    private readonly hmrHandler?: HmrModuleHandler<MongoServiceConstructor, void, MongoArtifact>;

    constructor(
        public readonly core: Core,
        private readonly options: MongoOptions
    ) {
        super(core);
        this.uri = options.uri;

        this.core.shutdown.addTask(
            ShutdownPhase.ExternalResources,
            'stop-database',
            async () => await this.stop(),
            this.options.timeout
        );

        if (!Envapter.isDevelopment) return;
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: this.options.dir,
            isHandler: this.isServiceClass.bind(this),
            registerHandler: this.initializeService.bind(this),
            unregisterHandler: this.unregister.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger,
            name: 'Mongo'
        });
    }

    private getArtifacts(ctor: MongoServiceConstructor): MongoArtifact {
        const key = Reflect.getMetadata(ServiceMetadataKey, ctor) as string | undefined;
        const model = Reflect.getMetadata(ModelMetadataKey, ctor) as mongoose.Model<unknown> | undefined;
        return {
            ...(key ? { key } : {}),
            ...(model?.modelName ? { modelName: model.modelName } : {})
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
        await this.loadServices();
        this.servicesReady = true;
    }

    public async stop(): Promise<void> {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        this.clearModels();
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
                throw new SeedcordError(SeedcordErrorCode.PluginMongoConnectionFailed, [this.options.name], {
                    cause: err
                });
            });
    }

    private clearModels(): void {
        const modelNames = Object.keys(mongoose.models);
        if (modelNames.length > 0) {
            this.logger.debug(`Clearing ${modelNames.length} mongoose models`);
            for (const name of modelNames) mongoose.deleteModel(name);
        }
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
                throw new SeedcordError(SeedcordErrorCode.PluginMongoDisconnectFailed, { cause: err });
            });
    }

    private async loadServices(): Promise<void> {
        const servicesDir = this.options.dir;
        this.logger.info(chalk.bold(servicesDir));

        await traverseDirectory(
            servicesDir,
            (fullPath, rel, mod) => {
                for (const Service of Object.values(mod)) {
                    if (this.isServiceClass(Service)) {
                        this.initializeService(Service, rel);
                        this.hmrHandler?.trackHandler(fullPath, Service);
                    }
                }
            },
            this.logger
        );

        this.logger.utils.list(
            [`${chalk.magenta(Object.keys(this._services).length)} services`],
            chalk.bold.green('Loaded')
        );
    }

    private initializeService(Service: MongoServiceConstructor, relativePath: string): void {
        const instance = new Service(this, this.core);
        this.logger.utils.registration(instance.constructor.name, relativePath);
    }

    private isServiceClass(obj: unknown): obj is MongoServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof MongoService &&
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

    private unregister(Service: MongoServiceConstructor, artifacts?: { key?: string; modelName?: string }): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(ServiceMetadataKey, Service) as string | undefined);
        const modelName =
            artifacts?.modelName ??
            (Reflect.getMetadata(ModelMetadataKey, Service) as mongoose.Model<unknown> | undefined)?.modelName;

        if (key && this._services[key]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- key is a runtime service name, not a static property
            delete this._services[key];
        }

        if (modelName) {
            mongoose.deleteModel(modelName);
        }
    }
}
