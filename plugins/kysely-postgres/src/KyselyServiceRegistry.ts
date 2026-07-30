import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';

import { KyselyServiceMetadataKey } from './decorators/RegisterKyselyService';
import { KyselyService } from './KyselyService';

import type { KyselyArtifact, KyselyPostgres } from './KyselyPostgres';
import type { KyselyServiceConstructor } from './KyselyService';
import type { KyselyServices } from './types/KyselyServices';
import type { CoreBase } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';

/**
 * Discovers and registers Postgres services for the plugin.
 */
export class KyselyServiceRegistry {
    private readonly services = Object.create(null) as KyselyServices;

    constructor(
        private readonly plugin: KyselyPostgres,
        private readonly core: CoreBase,
        private readonly logger: Logger
    ) {}

    public get map(): KyselyServices {
        return this.services;
    }

    public register(key: string, instance: unknown): void {
        // keyed at runtime, so the augmented shape's known keys do not cover it
        Reflect.set(this.services, key, instance);
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

    public unregister(Service: KyselyServiceConstructor, artifacts?: KyselyArtifact): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(KyselyServiceMetadataKey, Service) as string | undefined);
        if (key && Reflect.get(this.services, key)) {
            Reflect.deleteProperty(this.services, key);
        }
    }

    public initializeService(Service: KyselyServiceConstructor, relativePath: string): void {
        const instance = new Service(this.plugin, this.core);
        this.logger.utils.registration(instance.constructor.name, relativePath);
    }

    public isServiceClass(obj: unknown): obj is KyselyServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof KyselyService &&
            Reflect.hasMetadata(KyselyServiceMetadataKey, obj)
        );
    }
}
