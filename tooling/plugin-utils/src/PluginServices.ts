import 'reflect-metadata';

import { FolderExports } from '@seedcord/core/plugin';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

import type { Logger } from '@seedcord/logger';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { AbstractConstructor } from 'type-fest';

type ServiceClass = AbstractConstructor<object, never[]>;

interface PluginServicesOptions<TClass extends ServiceClass> {
    readonly pluginName: string;
    readonly path: string;
    readonly logger: Logger;
    readonly base: AbstractConstructor<InstanceType<TClass>, never[]>;
    readonly metadataKey: symbol;
    readonly decorator: string;
    readonly create: (Service: TClass) => InstanceType<TClass>;
    readonly remove?: (Service: TClass) => void;
}

// one instance of each decorated service class in a folder, by the key its decorator wrote
export class PluginServices<TClass extends ServiceClass, TServices extends object> {
    private readonly services = Object.create(null) as TServices;
    private readonly owners = new Map<string, TClass>();
    private readonly files: FolderExports<TClass>;
    private readonly warned = new WeakSet<object>();
    private loaded = false;

    constructor(private readonly options: PluginServicesOptions<TClass>) {
        this.files = new FolderExports({
            dir: options.path,
            is: (value): value is TClass => this.isService(value),
            register: (Service) => this.register(Service),
            unregister: (Service) => this.unregister(Service),
            logger: options.logger
        });
    }

    public get map(): TServices {
        if (!this.loaded) {
            throw new SeedcordError(SeedcordErrorCode.PluginNotReady, [this.options.pluginName, 'services']);
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
        this.owners.clear();
        for (const key of Object.keys(this.services)) Reflect.deleteProperty(this.services, key);
    }

    public handle(event: HmrUpdateEvent): Promise<void> {
        return this.files.handle(event);
    }

    public async codegen(): Promise<{ services: Record<string, TClass> }> {
        const found = new Map<string, TClass>();
        for (const Service of await this.files.scan()) this.claim(found, Service);
        return { services: Object.fromEntries(found) };
    }

    // isService has already checked that the decorator wrote this key
    private keyOf(Service: TClass): string {
        return Reflect.getMetadata(this.options.metadataKey, Service) as string;
    }

    // two classes with one key would overwrite each other's instance
    private claim(owners: Map<string, TClass>, Service: TClass): string {
        const key = this.keyOf(Service);
        const owner = owners.get(key);
        if (owner && owner !== Service) {
            throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                'service',
                key,
                [owner.name, Service.name]
            ]);
        }
        owners.set(key, Service);
        return key;
    }

    private register(Service: TClass): void {
        const key = this.claim(this.owners, Service);
        Reflect.set(this.services, key, this.options.create(Service));
    }

    private unregister(Service: TClass): void {
        const key = this.keyOf(Service);
        this.owners.delete(key);
        Reflect.deleteProperty(this.services, key);
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
            `${paint.bold(this.options.pluginName)} skipped ${paint.sky(value.name)} because it isn't decorated with ${paint.bold(this.options.decorator)}. Add the decorator to register it, or move a shared base class out of ${paint.path(this.options.path)}.`
        );
    }
}
