import { randomUUID } from 'node:crypto';

import { describe, it, expect } from 'vitest';

import { Bus } from '#subscribers/Bus';
import { Subscribe } from '#subscribers/decorators/Subscribe';
import { PublishDefault } from '#subscribers/publishDefault';
import { RegisterSubscriber } from '#subscribers/slots';
import { Subscriber } from '#subscribers/Subscriber';

import type { CoreBase } from '#interfaces/CoreBase';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';

describe("Bus 'once' re-entrancy", () => {
    it('runs a once subscriber a single time even if it re-publishes the same event', async () => {
        // justified: the subscriber reads core.bus to re-publish, nothing else on core
        const core = {} as unknown as CoreBase;
        const bus = new Bus(core);
        (core as { bus: Bus }).bus = bus;

        const payload: AllSubscriptions['unknownException'] = {
            uuid: randomUUID(),
            dispatchId: 'd-1',
            error: new Error('boom'),
            origin: 'slash:probe'
        };

        let runs = 0;
        @Subscribe('unknownException', { frequency: 'once' })
        class ReentrantOnce extends Subscriber<'unknownException', CoreBase> {
            public execute(): Promise<void> {
                runs += 1;
                // the old fire-then-mark order ran this a second time
                if (runs === 1) this.core.bus[PublishDefault]('unknownException', payload);
                return Promise.resolve();
            }
        }

        bus[RegisterSubscriber]({ keys: ['unknownException'], frequency: 'once', ctor: ReentrantOnce });

        bus[PublishDefault]('unknownException', payload);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(runs).toBe(1);
    });
});
