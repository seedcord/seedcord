import chalk from 'chalk';
import { traverseDirectory } from 'seedcord';

import { PgServiceMetadataKey } from './decorators/RegisterKpgService';
import { KpgService } from './KpgService';

import type { KyselyServiceConstructor } from './KpgService';
import type { KyselyPg } from './KyselyPg';
import type { AnyKpgService, KpgServiceKeys, KpgServices } from './types/KpgServices';
import type { Core, Logger } from 'seedcord';

/**
 * Discovers and registers Postgres services for the plugin.
 */
export class KpgServiceRegistry<Database extends object> {
    private readonly services: Record<string, AnyKpgService> = Object.create(null) as Record<string, AnyKpgService>;

    constructor(
        private readonly plugin: KyselyPg<Database>,
        private readonly core: Core,
        private readonly logger: Logger
    ) {}

    public get map(): KpgServices {
        return this.services as unknown as KpgServices;
    }

    public register(key: KpgServiceKeys, instance: AnyKpgService): void {
        this.services[key] = instance;
    }

    public async loadFromDirectory(dir: string): Promise<void> {
        this.logger.info(chalk.bold(dir));

        await traverseDirectory(
            dir,
            (_full, rel, mod) => {
                for (const Service of Object.values(mod)) {
                    if (this.isServiceClass(Service)) {
                        const instance = new Service(this.plugin, this.core);
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

    private isServiceClass(obj: unknown): obj is KyselyServiceConstructor<Database> {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof KpgService &&
            Reflect.hasMetadata(PgServiceMetadataKey, obj)
        );
    }
}
