import chalk from 'chalk';
import { traverseDirectory } from 'seedcord';

import { PgServiceMetadataKey } from './decorators/RegisterKpgService';
import { KpgService } from './KpgService';

import type { KyselyServiceConstructor } from './KpgService';
import type { KyselyArtifact, KyselyPg } from './KyselyPg';
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
            (fullPath, rel, mod) => {
                for (const Service of Object.values(mod)) {
                    if (this.isServiceClass(Service)) {
                        const instance = new Service(this.plugin, this.core);
                        this.logger.utils.registration(instance.constructor.name, rel);

                        // @ts-expect-error - private access on hmrHandler. hmrHandler is private as it's a development only api used by hmr
                        this.plugin.hmrHandler?.trackHandler(fullPath, Service);
                    }
                }
            },
            this.logger
        );

        this.logger.utils.list(
            [`${chalk.magenta(Object.keys(this.services).length)} services`],
            chalk.bold.green('Loaded')
        );
    }

    public unregister(Service: KyselyServiceConstructor<Database>, artifacts?: KyselyArtifact): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(PgServiceMetadataKey, Service) as string | undefined);
        if (key && (this.services as Record<string, unknown>)[key]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete (this.services as Record<string, unknown>)[key];
        }
    }

    public isServiceClass(obj: unknown): obj is KyselyServiceConstructor<Database> {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof KpgService &&
            Reflect.hasMetadata(PgServiceMetadataKey, obj)
        );
    }
}
