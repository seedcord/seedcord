import 'reflect-metadata';

import chalk from 'chalk';
import { Envapter } from 'envapt';
import mongoose from 'mongoose';
import {
    keepDefined,
    Logger,
    Plugin,
    SeedcordError,
    SeedcordErrorCode,
    ShutdownPhase,
    traverseDirectory
} from 'seedcord';

import { ServiceMetadataKey } from './decorators/RegisterMongoService';
import { MongoService } from './MongoService';

import type { MongoServiceConstructor } from './MongoService';
import type { MongoOptions } from './types/MongoOptions';
import type { MongoServices } from './types/MongoServices';
import type { Mongoose } from 'mongoose';
import type { Core } from 'seedcord';

/**
 * MongoDB integration plugin for Seedcord.
 *
 * Manages MongoDB connections, service loading, and provides type-safe
 * access to database services through service registration decorators.
 */
export class Mongo extends Plugin {
    public readonly logger = new Logger('Mongo');
    private isInitialised = false;
    private readonly uri: string;

    /**
     * Map of all loaded services.
     * Keys come from `@RegisterMongoService('key')`
     */
    public readonly services: MongoServices = {} as MongoServices;

    /** Exposed Mongoose instance once `init` completes. */
    declare public connection: Mongoose;

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
    }

    public async init(): Promise<void> {
        if (this.isInitialised) return;
        this.isInitialised = true;

        await this.connect();
        await this.loadServices();
    }

    public async stop(): Promise<void> {
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
                throw new SeedcordError(SeedcordErrorCode.PluginMongoConnectionFailed, [this.options.name], {
                    cause: err
                });
            });
    }

    private async disconnect(): Promise<void> {
        await this.connection
            .disconnect()
            .then(() => this.logger.info(chalk.red.bold('Disconnected from MongoDB')))
            .catch((err) => this.logger.error(`Could not disconnect from MongoDB: ${(err as Error).message}`));
    }

    private async loadServices(): Promise<void> {
        const servicesDir = this.options.dir;
        this.logger.info(chalk.bold(servicesDir));

        await traverseDirectory(
            servicesDir,
            (_full, rel, mod) => {
                for (const Service of Object.values(mod)) {
                    if (this.isServiceClass(Service)) {
                        const instance = new Service(this, this.core);
                        this.logger.info(
                            `${chalk.italic('Registered')} ${chalk.bold.yellow(instance.constructor.name)} from ${chalk.gray(rel)}`
                        );
                    }
                }
            },
            this.logger
        );

        this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta(Object.keys(this.services).length)} services`);
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
    _register<SKey extends keyof MongoServices>(key: SKey, instance: MongoServices[SKey]): void {
        this.services[key] = instance;
    }
}
