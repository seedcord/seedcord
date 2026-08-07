import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';
import { Envapter } from 'envapt';

import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { SubscribeMetadataKey } from '@src/metadataKeys';
import { registrationFor, Subscriber } from '@subscribers/index';

import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { Initializeable } from '@src/plugin/Plugin';
import type { SubscribeMetadataEntry } from '@subscribers/decorators/Subscribe';
import type { StoredSubscriberCtor, Bus } from '@subscribers/index';
import type { SubscriptionKey } from '@subscribers/types/Subscriptions';

type SubscriberArtifact = SubscriptionKey[];

// loads subscribers off the filesystem into a Bus and stores their hot-reload wiring. node only, a bundled isolate registers from the manifest instead
export class SubscriberLoader implements Initializeable, HmrAware {
    private isInitialized = false;
    private readonly hmrHandler?: HmrModuleHandler<StoredSubscriberCtor, void, SubscriberArtifact>;

    constructor(
        private readonly bus: Bus,
        private readonly directory: string | null
    ) {
        if (!this.directory) return;
        if (!Envapter.isDevelopment && !Envapter.isTest) return;

        this.hmrHandler = new HmrModuleHandler({
            handlersDir: this.directory,
            isHandler: this.isSubscriber.bind(this),
            registerHandler: this.registerSubscriber.bind(this),
            unregisterHandler: this.unregisterSubscriber.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.bus.logger
        });
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.bus.registerDefaults();

        const { directory } = this;
        if (directory) {
            this.bus.logger.debug(chalk.bold(directory));
            await this.load(directory);
            this.bus.logger.utils.list(
                [`${chalk.bold.magenta(this.bus.registeredCount)} subscribers`],
                chalk.bold.green('Loaded'),
                'debug'
            );
        }

        if (!Envapter.isTest) await this.bus.verifyWebhooks();
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.hmrHandler) await this.hmrHandler.handle(event);
    }

    private async load(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const exportName of Object.keys(imported)) {
                const value = imported[exportName];
                if (!this.isSubscriber(value)) continue;

                this.registerSubscriber(value);
                this.hmrHandler?.trackHandler(fullPath, value);
                this.bus.logger.utils.registration(value.name, relativePath, undefined, 'trace');
            }
        });
    }

    private registerSubscriber(ctor: StoredSubscriberCtor): void {
        this.bus.register(registrationFor(ctor));
    }

    private unregisterSubscriber(ctor: StoredSubscriberCtor, artifacts?: SubscriberArtifact): void {
        this.bus.unregister(ctor, artifacts);
    }

    private getArtifacts(ctor: StoredSubscriberCtor): SubscriberArtifact {
        const meta = Reflect.getMetadata(SubscribeMetadataKey, ctor) as SubscribeMetadataEntry;
        return [meta.subscriber];
    }

    private isSubscriber(value: unknown): value is StoredSubscriberCtor {
        if (typeof value !== 'function') return false;
        return value.prototype instanceof Subscriber && Reflect.hasMetadata(SubscribeMetadataKey, value);
    }
}
