import chalk from 'chalk';
import mongoose from 'mongoose';
import path from 'path';
import { DatabaseConnectionFailure } from '../../bot/errors/Database';
import { Globals } from '../library/globals/Globals';
import { throwCustomError, traverseDirectory } from '../library/Helpers';
import { Core } from '../library/interfaces/Core';
import { LogService } from '../services/LogService';
import { BaseService } from './BaseService';
import { ServiceMap } from './types/ServiceMap';
import { ServiceMetadataKey } from './decorators/DatabaseService';

export class Database {
  private readonly logger = new LogService('Database');
  private isInitialised = false;
  private readonly uri: string;

  /**
   * Map of all loaded services.
   * Keys come from `@DatabaseService('key')`
   */
  public readonly services: ServiceMap = {} as ServiceMap;

  constructor(
    public readonly core: Core,
    uriOverride?: string
  ) {
    this.uri = uriOverride ?? Globals.mongoUri;
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
      for (const Service of Object.values(mod) as unknown[]) {
        if (this.isServiceClass(Service)) {
          new Service(this);
          this.logger.info(`${chalk.italic('Registered')} ${chalk.bold.yellow(Service.name)} from ${chalk.gray(rel)}`);
        }
      }
    });

    this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.magenta(Object.keys(this.services).length)} services`);
  }

  private isServiceClass(obj: unknown): obj is new (db: Database) => BaseService<any> {
    return (
      typeof obj === 'function' && obj.prototype instanceof BaseService && Reflect.hasMetadata(ServiceMetadataKey, obj)
    );
  }

  _register<K extends keyof ServiceMap>(key: K, instance: ServiceMap[K]): void {
    this.services[key] = instance;
  }
}
