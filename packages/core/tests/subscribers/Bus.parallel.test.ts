import { describe, it, expect } from 'vitest';

import { Subscribe } from '#subscribers/decorators/Subscribe';
import { Bus, registrationFor } from '#subscribers/index';
import { PublishDefault } from '#subscribers/publishDefault';
import { RegisterSubscriber } from '#subscribers/slots';
import { Subscriber } from '#subscribers/Subscriber';

import type { CoreBase } from '#interfaces/CoreBase';
import type { StoredSubscriberCtor } from '#subscribers/Bus';

const order: string[] = [];

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

@Subscribe('unknownException')
class SlowSubscriber extends Subscriber<'unknownException', CoreBase> {
    async execute(): Promise<void> {
        await delay(30);
        order.push('slow');
    }
}

@Subscribe('unknownException')
class FastSubscriber extends Subscriber<'unknownException', CoreBase> {
    execute(): Promise<void> {
        order.push('fast');
        return Promise.resolve();
    }
}

// justified: the Bus only stores core, no member is read during publish
function busWith(...ctors: StoredSubscriberCtor[]): Bus {
    const bus = new Bus({} as unknown as CoreBase);
    for (const ctor of ctors) bus[RegisterSubscriber](registrationFor(ctor));
    return bus;
}

describe('Bus subscriber concurrency', () => {
    it('starts a later subscriber without waiting for a slow earlier one', async () => {
        order.length = 0;
        const bus = busWith(SlowSubscriber, FastSubscriber);

        bus[PublishDefault]('unknownException', {
            uuid: crypto.randomUUID(),
            error: new Error('boom'),
            routeId: 'slash:probe'
        });
        await delay(60);

        expect(order).toEqual(['fast', 'slow']);
    });
});
