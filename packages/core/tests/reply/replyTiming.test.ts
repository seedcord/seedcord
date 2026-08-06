import { Logger } from '@seedcord/logger';
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { publishResponse } from '@reply/responseReport';
import { Bus } from '@subscribers/Bus';

import type { CoreBase } from '@interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

function traceSpy(): MockInstance<Logger['trace']> {
    return vi.spyOn(Logger.prototype, 'trace').mockImplementation(() => undefined);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('reply timing', () => {
    it('traces the route, the verb, the outcome, and the elapsed write', () => {
        const trace = traceSpy();
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const startedAt = performance.now();
        clock += 88;

        publishResponse(
            { bus: stubBus(), interactionId: 'i1' },
            { routeId: 'slash:ban', method: 'reply', startedAt, outcome: 'sent', messageId: 'm1' }
        );

        expect(trace).toHaveBeenCalledTimes(1);
        const message = trace.mock.calls[0]?.[0] ?? '';
        expect(message).toContain('slash:ban');
        expect(message).toContain('reply');
        expect(message).toContain('sent');
        expect(message).toContain('88ms');
    });

    it('traces a failed write with its outcome', () => {
        const trace = traceSpy();

        publishResponse(
            { bus: stubBus(), interactionId: 'i1' },
            {
                routeId: 'slash:ban',
                method: 'respond',
                startedAt: performance.now(),
                outcome: 'failed',
                messageId: null,
                error: new Error('discord said no')
            }
        );

        const message = trace.mock.calls[0]?.[0] ?? '';
        expect(message).toContain('respond');
        expect(message).toContain('failed');
    });
});
