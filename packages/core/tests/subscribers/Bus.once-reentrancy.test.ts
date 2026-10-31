import { randomUUID } from 'node:crypto';

import { describe, it, expect } from 'vitest';

import { Bus } from '#subscribers/Bus';
import { Subscribe } from '#subscribers/decorators/Subscribe';
import { PublishDefault } from '#subscribers/publishDefault';
import { RegisterSubscriber, UnregisterSubscriber } from '#subscribers/slots';
import { Subscriber } from '#subscribers/Subscriber';

import type { CoreBase } from '#interfaces/CoreBase';
import type { StoredSubscriberCtor } from '#subscribers/Bus';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';

function busWithCore(): Bus {
    // justified: a subscriber here reads only core.bus
    const core = {} as unknown as CoreBase;
    const bus = new Bus(core);
    (core as { bus: Bus }).bus = bus;
    return bus;
}

const payload: AllSubscriptions['unknownException'] = {
    uuid: randomUUID(),
    dispatchId: 'd-1',
    error: new Error('boom'),
    origin: 'slash:probe'
};

function publish(bus: Bus): void {
    bus[PublishDefault]('unknownException', payload);
}

function onceCounter(): { Counted: StoredSubscriberCtor; runs: () => number } {
    let runs = 0;
    @Subscribe('unknownException', { frequency: 'once' })
    class Counted extends Subscriber<'unknownException', CoreBase> {
        public execute(): Promise<void> {
            runs += 1;
            return Promise.resolve();
        }
    }
    return { Counted, runs: () => runs };
}

describe("Bus 'once' subscribers", () => {
    it('runs a once subscriber a single time even if it re-publishes the same event', () => {
        const bus = busWithCore();

        let runs = 0;
        @Subscribe('unknownException', { frequency: 'once' })
        class ReentrantOnce extends Subscriber<'unknownException', CoreBase> {
            public execute(): Promise<void> {
                runs += 1;
                // the old invoke-then-mark order ran this a second time
                if (runs === 1) this.core.bus[PublishDefault]('unknownException', payload);
                return Promise.resolve();
            }
        }

        bus[RegisterSubscriber]({ keys: ['unknownException'], frequency: 'once', ctor: ReentrantOnce });
        publish(bus);

        expect(runs).toBe(1);
    });

    it('keeps a spent once subscriber spent when a rollback registers the same class again', () => {
        const bus = busWithCore();
        const { Counted, runs } = onceCounter();

        bus[RegisterSubscriber]({ keys: ['unknownException'], frequency: 'once', ctor: Counted });
        publish(bus);
        bus[UnregisterSubscriber](Counted);
        bus[RegisterSubscriber]({ keys: ['unknownException'], frequency: 'once', ctor: Counted });
        publish(bus);

        expect(runs()).toBe(1);
    });

    it('runs a once subscriber again after a save loads a new class', () => {
        const bus = busWithCore();
        const before = onceCounter();
        const after = onceCounter();

        bus[RegisterSubscriber]({ keys: ['unknownException'], frequency: 'once', ctor: before.Counted });
        publish(bus);
        bus[UnregisterSubscriber](before.Counted);
        bus[RegisterSubscriber]({ keys: ['unknownException'], frequency: 'once', ctor: after.Counted });
        publish(bus);

        expect([before.runs(), after.runs()]).toEqual([1, 1]);
    });
});
