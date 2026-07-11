import { randomUUID } from 'node:crypto';

import { describe, it, expect } from 'vitest';

import { Bus } from '../../src/subscribers/Bus';
import { Subscriber } from '../../src/subscribers/Subscriber';
import '../utils/mock-env';

import type { Core } from '../../src/interfaces/Core';
import type { AllSubscriptions } from '../../src/subscribers/types/Subscriptions';

// justified: exposes the private subscribersMap so the test can inject a subscriber without disk I/O.
interface PrivateBus {
    subscribersMap: Map<string, { ctor: unknown; frequency: string }[]>;
}

describe("Bus 'once' re-entrancy", () => {
    it('runs a once subscriber a single time even if it re-publishes the same event', async () => {
        // justified: minimal Core stub, Bus only reads config.subscribers.path at construction.
        const core = { config: { subscribers: { path: null } } } as unknown as Core;
        const bus = new Bus(core);
        (core as { bus: Bus }).bus = bus;

        const payload: AllSubscriptions['unknownException'] = {
            uuid: randomUUID(),
            error: new Error('boom')
        };

        let runs = 0;
        class ReentrantOnce extends Subscriber<'unknownException'> {
            public execute(): Promise<void> {
                runs += 1;
                // re-publish while still executing, the old fire-then-mark order ran this twice
                if (runs === 1) this.core.bus.publish('unknownException', payload);
                return Promise.resolve();
            }
        }

        (bus as unknown as PrivateBus).subscribersMap.set('unknownException', [
            { ctor: ReentrantOnce, frequency: 'once' }
        ]);

        bus.publish('unknownException', payload);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(runs).toBe(1);
    });
});
