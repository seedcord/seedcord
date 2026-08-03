import { Bus } from '@seedcord/core';
import { describe, it, expect } from 'vitest';

import { extractErrorResponse } from '@miscellaneous/extractErrorResponse';

import '../utils/mock-env';

import type { Core } from '@interfaces/Core';

// justified: extractErrorResponse reads errors + notifications, the Bus reads nothing off core here
function stubCore(): Core {
    const core = { config: { errors: {}, notifications: {} } } as unknown as Core;
    (core as { bus: Bus }).bus = new Bus(core);
    return core;
}

describe('fault throttle with a throwing listener', () => {
    it('stamps the throttle when a listener throws, so the same fault stays throttled', () => {
        const core = stubCore();
        const { bus } = core;

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
