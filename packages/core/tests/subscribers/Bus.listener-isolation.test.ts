import { randomUUID } from 'node:crypto';

import { describe, it, expect, vi } from 'vitest';

import { Bus } from '#subscribers/Bus';
import { PublishDefault } from '#subscribers/publishDefault';

import type { CoreBase } from '#interfaces/CoreBase';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

const faultPayload = (): AllSubscriptions['unknownException'] => ({
    uuid: randomUUID(),
    error: new Error('boom'),
    routeId: 'slash:probe'
});

describe('Bus listener isolation', () => {
    it('does not propagate a throwing on() listener out of publish', () => {
        const bus = stubBus();

        bus.on('unknownException', () => {
            throw new Error('listener blew up');
        });

        expect(() => bus[PublishDefault]('unknownException', faultPayload())).not.toThrow();
    });

    it('runs later listeners after an earlier one throws', () => {
        const bus = stubBus();

        let reached = false;
        bus.on('unknownException', () => {
            throw new Error('listener blew up');
        });
        bus.on('unknownException', () => {
            reached = true;
        });

        try {
            bus[PublishDefault]('unknownException', faultPayload());
        } catch {
            // the first case covers the escape, this one measures the later listener
        }

        expect(reached).toBe(true);
    });

    it('logs the listener error through its own logger', () => {
        const bus = stubBus();
        const error = vi.spyOn(bus.logger, 'error');
        const thrown = new Error('listener blew up');

        bus.on('unknownException', () => {
            throw thrown;
        });
        bus[PublishDefault]('unknownException', faultPayload());

        expect(error).toHaveBeenCalledWith('listener for unknownException threw', thrown);
    });
});
