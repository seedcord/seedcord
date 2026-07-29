import { randomUUID } from 'node:crypto';

import { describe, it, expect } from 'vitest';

import { Bus } from '@subscribers/Bus';
import { Subscribe } from '@subscribers/decorators/Subscribe';
import { Subscriber } from '@subscribers/Subscriber';

import type { CoreBase } from '@interfaces/CoreBase';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';

describe("Bus 'once' re-entrancy", () => {
    it('runs a once subscriber a single time even if it re-publishes the same event', async () => {
        // justified: the subscriber reads core.bus to re-publish, nothing else on core
        const core = {} as unknown as CoreBase;
        const bus = new Bus(core);
        (core as { bus: Bus }).bus = bus;

        const payload: AllSubscriptions['unknownException'] = {
            uuid: randomUUID(),
            error: new Error('boom')
        };

        let runs = 0;
        @Subscribe('unknownException', { frequency: 'once' })
        class ReentrantOnce extends Subscriber<'unknownException', CoreBase> {
            public execute(): Promise<void> {
                runs += 1;
                // re-publish while still executing, the old fire-then-mark order ran this twice
                if (runs === 1) this.core.bus.publish('unknownException', payload);
                return Promise.resolve();
            }
        }

        bus.register({
            keys: ['unknownException'],
            frequency: 'once',
            resolve: () => ReentrantOnce,
            ctor: ReentrantOnce
        });

        bus.publish('unknownException', payload);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(runs).toBe(1);
    });
});
