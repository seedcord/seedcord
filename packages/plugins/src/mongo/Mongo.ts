import 'reflect-metadata';

import chalk from 'chalk';
import { Envapter } from 'envapt';
import mongoose from 'mongoose';
import { Logger, Plugin, ShutdownPhase, traverseDirectory } from 'seedcord';

import { BaseService } from './BaseService';
import { ServiceMetadataKey } from './decorators/DatabaseService';

import type { BaseServiceConstructor } from './BaseService';
import type { Services } from './types/Services';
import type { Core } from 'seedcord';

/**
 * Configuration options for MongoDB connection and service loading.
 */
interface MongoOptions {
    /** Directory path containing database service classes */
    dir: string;
    /** MongoDB connection URI */
    uri: string;
    /** Database name to use */
    name: string;
}

/**
 * MongoDB integration plugin for Seedcord.
 *
 * Manages MongoDB connections, service loading, and provides type-safe
 * access to database services through service registration decorators.
 */
export class Mongo extends Plugin {
    public readonly logger = new Logger('MongoDB');
    private isInitialised = false;
    private readonly uri: string;

    /**
     * Map of all loaded services.
     * Keys come from `@DatabaseService('key')`
     */
    public readonly services: Services = {} as Services;

    constructor(
        public readonly core: Core,
        private readonly options: MongoOptions
    ) {
        super(core);
        this.uri = options.uri;

        this.core.shutdown.addTask(ShutdownPhase.ExternalResources, 'stop-database', async () => await this.stop());
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
        await mongoose
            .connect(this.uri, {
                dbName: this.options.name,
                ...(Envapter.isProduction && { tls: true, ssl: true })
            })
            .then((i) => this.logger.info(`Connected to MongoDB: ${chalk.bold.magenta(i.connection.name)}`))
            .catch((err) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                throw new Error(`Could not connect to MongoDB`, err);
            });
    }

    private async disconnect(): Promise<void> {
        await mongoose
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

    private isServiceClass(obj: unknown): obj is BaseServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof BaseService &&
            Reflect.hasMetadata(ServiceMetadataKey, obj)
        );
    }

    _register<SKey extends keyof Services>(key: SKey, instance: Services[SKey]): void {
        this.services[key] = instance;
    }
}
