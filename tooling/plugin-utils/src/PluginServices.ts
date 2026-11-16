import 'reflect-metadata';

import { FolderExports } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { AbstractConstructor } from 'type-fest';

type ServiceClass = AbstractConstructor<object, never[]>;

interface PluginServicesOptions<TClass extends ServiceClass> {
    readonly pluginName: string;
    readonly dir: string;
    readonly logger: Logger;
    readonly base: AbstractConstructor<InstanceType<TClass>, never[]>;
    readonly metadataKey: symbol;
    readonly decorator: string;
    // TClass only types the base class. TServices types each instance once codegen runs
    readonly create: (Service: TClass) => object;
    readonly remove?: (Service: TClass) => void;
}

// one instance of each decorated service class in a folder, by the key its decorator wrote
export class PluginServices<TClass extends ServiceClass, TServices extends object> {
    private readonly services = Object.create(null) as TServices;
    private readonly files: FolderExports<TClass>;
    private readonly warned = new WeakSet<object>();
    private loaded = false;

    constructor(private readonly options: PluginServicesOptions<TClass>) {
        this.files = new FolderExports({
            dir: options.dir,
            is: (value): value is TClass => this.isService(value),
            register: (Service) => Reflect.set(this.services, this.keyOf(Service), options.create(Service)),
            unregister: (Service) => this.unregister(Service),
            logger: options.logger
        });
    }

    public get map(): TServices {
        if (!this.loaded) {
            throw new SeedcordError(SeedcordErrorCode.PluginServicesNotReady, [this.options.pluginName, 'services']);
        }
        return this.services;
    }

    public async load(): Promise<void> {
        await this.files.load().catch((error: unknown) => {
            // the files before the one that threw already registered their services
            this.clear();
            throw error;
        });
        this.loaded = true;
        this.options.logger.utils.list(
            [`${paint.iris.bold(Object.keys(this.services).length)} services`],
            paint.mint.bold('Loaded'),
            'debug'
        );
    }

    public clear(): void {
        this.loaded = false;
        for (const key of Object.keys(this.services)) Reflect.deleteProperty(this.services, key);
    }

    public handle(event: HmrUpdateEvent): Promise<void> {
        return this.files.handle(event);
    }

    public async codegen(): Promise<{ services: Record<string, TClass> }> {
        const found = await this.files.scan();
        return { services: Object.fromEntries(found.map((Service) => [this.keyOf(Service), Service])) };
    }

    // isService has already checked that the decorator wrote this key
    private keyOf(Service: TClass): string {
        return Reflect.getMetadata(this.options.metadataKey, Service) as string;
    }

    private unregister(Service: TClass): void {
        Reflect.deleteProperty(this.services, this.keyOf(Service));
        this.options.remove?.(Service);
    }

    private isService(value: unknown): value is TClass {
        const { base, metadataKey } = this.options;
        if (typeof value !== 'function' || !(value.prototype instanceof base)) return false;
        if (Reflect.hasMetadata(metadataKey, value)) return true;

        this.warnUndecorated(value);
        return false;
    }

    // a barrel that re-exports the class passes it here a second time
    private warnUndecorated(value: { name: string }): void {
        if (this.warned.has(value)) return;
        this.warned.add(value);
        this.options.logger.warn(
            `${paint.bold(this.options.pluginName)} skipped ${paint.sky(value.name)} because it isn't decorated with ${paint.bold(this.options.decorator)}. Add the decorator to register it, or move a shared base class out of ${paint.path(this.options.dir)}.`
        );
    }
}
