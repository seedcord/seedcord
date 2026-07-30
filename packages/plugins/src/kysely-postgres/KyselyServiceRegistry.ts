import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';

import { KyselyServiceMetadataKey } from './decorators/RegisterKyselyService';
import { KyselyService } from './KyselyService';

import type { KyselyArtifact, KyselyPostgres } from './KyselyPostgres';
import type { KyselyServiceConstructor } from './KyselyService';
import type { KyselyServices } from './types/KyselyServices';
import type { Core } from '@seedcord/gateway';
import type { Logger } from '@seedcord/logger';

/**
 * Discovers and registers Postgres services for the plugin.
 */
export class KyselyServiceRegistry<Database extends object> {
    private readonly services: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

    constructor(
        private readonly plugin: KyselyPostgres<Database>,
        private readonly core: Core,
        private readonly logger: Logger
    ) {}

    public get map(): KyselyServices {
        // KyselyServices is augmented per-consumer via declaration merging; the registry holds the
        // instances opaquely and exposes the generated map shape at this boundary.
        return this.services;
    }

    public register(key: string, instance: unknown): void {
        this.services[key] = instance;
    }

    public async loadFromDirectory(dir: string): Promise<void> {
        this.logger.info(chalk.bold(dir));

        await traverseDirectory(dir, (fullPath, rel, mod) => {
            for (const Service of Object.values(mod)) {
                if (!this.isServiceClass(Service)) continue;

                this.initializeService(Service, rel);
                this.plugin.trackServiceFile(fullPath, Service);
            }
        });

        this.logger.utils.list(
            [`${chalk.magenta(Object.keys(this.services).length)} services`],
            chalk.bold.green('Loaded')
        );
    }

    public unregister(Service: KyselyServiceConstructor<Database>, artifacts?: KyselyArtifact): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(KyselyServiceMetadataKey, Service) as string | undefined);
        if (key && this.services[key]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- key is a runtime service name, not a static property
            delete this.services[key];
        }
    }

    public initializeService(Service: KyselyServiceConstructor<Database>, relativePath: string): void {
        const instance = new Service(this.plugin, this.core);
        this.logger.utils.registration(instance.constructor.name, relativePath);
    }

    public isServiceClass(obj: unknown): obj is KyselyServiceConstructor<Database> {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof KyselyService &&
            Reflect.hasMetadata(KyselyServiceMetadataKey, obj)
        );
    }
}
