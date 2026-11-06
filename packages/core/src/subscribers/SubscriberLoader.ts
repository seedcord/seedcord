import { paint } from '@seedcord/errors';
import { displayPath } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { FolderExports } from '#hmr/FolderExports';
import { SubscribeMetadataKey } from '#src/metadataKeys';
import { busLoggerOf } from '#subscribers/Bus';
import { Subscriber } from '#subscribers/index';
import {
    RegisterDefaults,
    RegisteredCount,
    RegisterSubscriber,
    UnregisterSubscriber,
    VerifyWebhooks
} from '#subscribers/slots';

import type { Initializeable } from '#src/plugin/Plugin';
import type { StoredSubscriberCtor, Bus } from '#subscribers/index';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';

export class SubscriberLoader implements Initializeable, HmrAware {
    private isInitialized = false;
    private readonly subscriberFiles?: FolderExports<StoredSubscriberCtor>;

    constructor(
        private readonly bus: Bus,
        directory: string | null
    ) {
        if (!directory) return;

        this.subscriberFiles = new FolderExports({
            dir: directory,
            is: this.isSubscriber.bind(this),
            register: this.registerSubscriber.bind(this),
            unregister: (ctor) => this.bus[UnregisterSubscriber](ctor),
            logger: busLoggerOf(this.bus)
        });
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.bus[RegisterDefaults]();

        if (this.subscriberFiles) {
            await this.subscriberFiles.load();
            busLoggerOf(this.bus).utils.list(
                [`${paint.iris.bold(this.bus[RegisteredCount])} subscribers`],
                paint.mint.bold('Loaded'),
                'debug'
            );
        }

        if (!Envapter.isTest) await this.bus[VerifyWebhooks]();
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.subscriberFiles?.handle(event);
    }

    private registerSubscriber(ctor: StoredSubscriberCtor, file: string): void {
        this.bus[RegisterSubscriber](ctor);
        busLoggerOf(this.bus).utils.registration(ctor.name, displayPath(file), undefined, 'trace');
    }

    private isSubscriber(value: unknown): value is StoredSubscriberCtor {
        if (typeof value !== 'function') return false;
        return value.prototype instanceof Subscriber && Reflect.hasMetadata(SubscribeMetadataKey, value);
    }
}
