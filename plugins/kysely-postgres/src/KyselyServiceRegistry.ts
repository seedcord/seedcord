import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';

import { KyselyServiceMetadataKey } from './decorators/RegisterKyselyService';
import { KyselyService } from './KyselyService';

import type { KyselyArtifact, KyselyPostgres } from './KyselyPostgres';
import type { KyselyServiceConstructor } from './KyselyService';
import type { KyselyServices } from './types/KyselyServices';
import type { CoreBase } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';

export class KyselyServiceRegistry {
    // the augmented interface has no index signature, hence Reflect below
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
        Reflect.set(this.services, key, instance);
    }

    public clear(): void {
        for (const key of Object.keys(this.services)) Reflect.deleteProperty(this.services, key);
    }

    public async loadFromDirectory(dir: string): Promise<void> {
        this.logger.debug(chalk.bold(dir));

        await traverseDirectory(dir, (fullPath, rel, mod) => {
            for (const Service of Object.values(mod)) {
                if (!this.isServiceClass(Service)) continue;

                this.initializeService(Service);
                this.logger.utils.registration(Service.name, rel, undefined, 'trace');
                this.plugin.trackServiceFile(fullPath, Service);
            }
        });

        this.logger.utils.list(
            [`${chalk.magenta(Object.keys(this.services).length)} services`],
            chalk.bold.green('Loaded'),
            'debug'
        );
    }

    public unregister(Service: KyselyServiceConstructor, artifacts?: KyselyArtifact): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(KyselyServiceMetadataKey, Service) as string | undefined);
        if (key && Reflect.get(this.services, key)) {
            Reflect.deleteProperty(this.services, key);
        }
    }

    public initializeService(Service: KyselyServiceConstructor): void {
        // eslint-disable-next-line no-new -- the base ctor calls _register, so constructing is the registration
        new Service(this.plugin, this.core);
    }

    public isServiceClass(obj: unknown): obj is KyselyServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof KyselyService &&
            Reflect.hasMetadata(KyselyServiceMetadataKey, obj)
        );
    }
}
