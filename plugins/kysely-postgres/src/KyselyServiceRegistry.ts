import { FolderExports } from '@seedcord/core/plugin';
import { paint } from '@seedcord/errors';
import { importFiles } from '@seedcord/utils';

import { KyselyServiceMetadataKey } from './decorators/RegisterKyselyService';
import { KyselyService } from './KyselyService';

import type { KyselyPostgres } from './KyselyPostgres';
import type { KyselyServiceConstructor } from './KyselyService';
import type { KyselyServices } from './types/KyselyServices';
import type { CoreBase } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';

interface FoundService {
    readonly key: string;
    readonly Service: KyselyServiceConstructor;
}

function serviceKeyOf(Service: KyselyServiceConstructor): string | undefined {
    const key: unknown = Reflect.getMetadata(KyselyServiceMetadataKey, Service);
    return typeof key === 'string' ? key : undefined;
}

export class KyselyServiceRegistry {
    private readonly services = Object.create(null) as KyselyServices;
    private readonly serviceFiles: FolderExports<KyselyServiceConstructor>;

    constructor(
        private readonly plugin: KyselyPostgres,
        private readonly core: CoreBase,
        private readonly logger: Logger,
        dir: string
    ) {
        this.serviceFiles = new FolderExports({
            dir,
            is: (value): value is KyselyServiceConstructor => this.isServiceClass(value),
            register: (Service) => this.initializeService(Service),
            unregister: (Service) => this.unregister(Service),
            logger
        });
    }

    public get map(): KyselyServices {
        return this.services;
    }

    public register(key: string, instance: unknown): void {
        Reflect.set(this.services, key, instance);
    }

    public clear(): void {
        for (const key of Object.keys(this.services)) Reflect.deleteProperty(this.services, key);
    }

    public async *serviceClassesIn(dir: string): AsyncGenerator<FoundService> {
        for await (const { imported } of importFiles(dir)) {
            for (const Service of Object.values(imported)) {
                if (!this.isServiceClass(Service)) continue;
                const key = serviceKeyOf(Service);
                if (key !== undefined) yield { key, Service };
            }
        }
    }

    public async load(): Promise<void> {
        await this.serviceFiles.load();
        this.logger.utils.list(
            [`${paint.iris.bold(Object.keys(this.services).length)} services`],
            paint.mint.bold('Loaded'),
            'debug'
        );
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.serviceFiles.handle(event);
    }

    private unregister(Service: KyselyServiceConstructor): void {
        const key = serviceKeyOf(Service);
        if (key) Reflect.deleteProperty(this.services, key);
    }

    private initializeService(Service: KyselyServiceConstructor): void {
        // eslint-disable-next-line no-new -- the base ctor calls _register, so constructing is the registration
        new Service(this.plugin, this.core);
    }

    private isServiceClass(obj: unknown): obj is KyselyServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof KyselyService &&
            Reflect.hasMetadata(KyselyServiceMetadataKey, obj)
        );
    }
}
