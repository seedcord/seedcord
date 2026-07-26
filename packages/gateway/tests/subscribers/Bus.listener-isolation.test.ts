import { randomUUID } from 'node:crypto';

import { describe, it, expect, vi } from 'vitest';

import { extractErrorResponse } from '@miscellaneous/extractErrorResponse';
import { Bus } from '@subscribers/Bus';
import '../utils/mock-env';

import type { Core } from '@interfaces/Core';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';

// justified: Bus reads config.subscribers.path at construction, extractErrorResponse reads errors + notifications.
function stubCore(): Core {
    const core = { config: { subscribers: { path: null }, errors: {}, notifications: {} } } as unknown as Core;
    (core as { bus: Bus }).bus = new Bus(core);
    return core;
}

const faultPayload = (): AllSubscriptions['unknownException'] => ({
    uuid: randomUUID(),
    error: new Error('boom')
});

describe('Bus listener isolation', () => {
    it('does not propagate a throwing on() listener out of publish', () => {
        const { bus } = stubCore();

        bus.on('unknownException', () => {
            throw new Error('listener blew up');
        });

        expect(() => bus.publish('unknownException', faultPayload())).not.toThrow();
    });

    it('runs later listeners after an earlier one throws', () => {
        const { bus } = stubCore();

        let reached = false;
        bus.on('unknownException', () => {
            throw new Error('listener blew up');
        });
        bus.on('unknownException', () => {
            reached = true;
        });

        try {
            bus.publish('unknownException', faultPayload());
        } catch {
            // the first case covers the escape, this one measures the later listener
        }

        expect(reached).toBe(true);
    });

    it('logs the listener error through its own logger', () => {
        const { bus } = stubCore();
        const error = vi.spyOn(bus.logger, 'error');
        const thrown = new Error('listener blew up');

        bus.on('unknownException', () => {
            throw thrown;
        });
        bus.publish('unknownException', faultPayload());

        expect(error).toHaveBeenCalledWith('listener for unknownException threw', thrown);
    });

    it('stamps the fault throttle when a listener throws', () => {
        const core = stubCore();
        const bus = core.bus;

        const thrower = (): never => {
            throw new Error('listener blew up');
        };
        bus.on('unknownException', thrower);

        const origin = { route: 'throttle-listener-probe', guild: null, user: null };
        try {
            extractErrorResponse(new Error('a bug'), core, origin);
        } catch {
            // the throw is the bug, the assertion below measures the throttle stamp it skipped
        }

        bus.off('unknownException', thrower);
        let republished = 0;
        bus.on('unknownException', () => {
            republished += 1;
        });
        extractErrorResponse(new Error('a bug'), core, origin);

        expect(republished).toBe(0);
    });
});
