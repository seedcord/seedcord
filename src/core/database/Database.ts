import path from 'path';

import chalk from 'chalk';
import mongoose from 'mongoose';

import { BaseService } from './BaseService';
import { DatabaseConnectionFailure } from '../../bot/errors/Database';
import { Globals } from '../library/globals/Globals';
import { throwCustomError, traverseDirectory } from '../library/Helpers';
import { Logger } from '../services/Logger';
import { ServiceMetadataKey } from './decorators/DatabaseService';
import { ShutdownPhase } from '../services/CoordinatedShutdown';

import type { Services } from './types/Services';
import type { Core } from '../library/interfaces/Core';
import type { TypeOfIDocument } from '../library/types/Miscellaneous';

export class Database {
  private readonly logger = new Logger('Database');
  private isInitialised = false;
  private readonly uri: string;

  /**
   * Map of all loaded services.
   * Keys come from `@DatabaseService('key')`
   */
  public readonly services: Services = {} as Services;

  constructor(
    public readonly core: Core,
    uriOverride?: string
  ) {
    this.uri = uriOverride ?? Globals.mongoUri;

    this.core.shutdown.addTask(ShutdownPhase.ExternalResources, 'stop-database', async () => await this.stop());
  }

  public async start(): Promise<void> {
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
        dbName: Globals.dbName,
        ...(Globals.isProduction && { tls: true, ssl: true })
      })
      .then((i) => this.logger.info(`Connected to MongoDB: ${chalk.bold.magenta(i.connection.name)}`))
      .catch((err) => throwCustomError(err, 'Could not connect to MongoDB', DatabaseConnectionFailure));
  }

  private async disconnect(): Promise<void> {
    await mongoose
      .disconnect()
      .then(() => this.logger.info(chalk.red.bold('Disconnected from MongoDB')))
      .catch((err) => this.logger.error(`Could not disconnect from MongoDB: ${(err as Error).message}`));
  }

  private async loadServices(): Promise<void> {
    const servicesDir = path.resolve(__dirname, './services');
    this.logger.info(chalk.bold(servicesDir));

    await traverseDirectory(servicesDir, (_full, rel, mod) => {
      for (const Service of Object.values(mod)) {
        if (this.isServiceClass(Service)) {
          const instance = new Service(this);
          this.logger.info(
            `${chalk.italic('Registered')} ${chalk.bold.yellow(instance.constructor.name)} from ${chalk.gray(rel)}`
          );
        }
      }
    });

    this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta(Object.keys(this.services).length)} services`);
  }

  private isServiceClass(obj: unknown): obj is new (db: Database) => BaseService<TypeOfIDocument> {
    return (
      typeof obj === 'function' && obj.prototype instanceof BaseService && Reflect.hasMetadata(ServiceMetadataKey, obj)
    );
  }

  _register<K extends keyof Services>(key: K, instance: Services[K]): void {
    this.services[key] = instance;
  }
}
