import { RegisterSubscriber, registrationFor, SubscribeMetadataKey } from '@seedcord/core/internal';

import { isSubscriberClass, noRoutes, wrongClass } from '#src/manifest/entries';

import type { Manifest } from '#src/manifest/Manifest';
import type { Bus } from '@seedcord/core';

export function registerSubscribers(bus: Bus, subscribers: Manifest['subscribers']): void {
    for (const ctor of subscribers) {
        if (!isSubscriberClass(ctor)) throw wrongClass('subscribers', ctor, 'Subscriber');
        // registrationFor dereferences the @Subscribe entry without checking it
        if (!Reflect.hasMetadata(SubscribeMetadataKey, ctor)) throw noRoutes('subscribers', ctor.name, '@Subscribe');

        bus[RegisterSubscriber](registrationFor(ctor));
    }
}
