import { captureLogs } from '@seedcord/logger/internal';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { publishResponse } from '#reply/responseReport';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('reply timing', () => {
    it('puts the line on the interactions channel at trace', () => {
        using logs = captureLogs();

        publishResponse(
            { bus: stubBus(), dispatch: new DispatchContext('slash', 'ban'), interactionId: 'i1' },
            { method: 'reply', startedAt: performance.now(), outcome: 'sent', messageId: 'm1' }
        );

        expect(logs.records.find((record) => record.label === 'Reply')).toMatchObject({
            channel: 'interactions',
            level: 'trace'
        });
    });

    it('traces the route, the verb, the outcome, and the elapsed write', () => {
        using logs = captureLogs();
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const startedAt = performance.now();
        clock += 88;

        publishResponse(
            { bus: stubBus(), dispatch: new DispatchContext('slash', 'ban'), interactionId: 'i1' },
            { method: 'reply', startedAt, outcome: 'sent', messageId: 'm1' }
        );

        const traces = logs.at('trace');
        expect(traces).toHaveLength(1);
        const [message] = traces;
        expect(message).toContain('slash:ban');
        expect(message).toContain('reply');
        expect(message).toContain('sent');
        expect(message).toContain('88ms');
    });

    it('traces a failed write with its outcome', () => {
        using logs = captureLogs();

        publishResponse(
            { bus: stubBus(), dispatch: new DispatchContext('slash', 'ban'), interactionId: 'i1' },
            {
                method: 'respond',
                startedAt: performance.now(),
                outcome: 'failed',
                error: new Error('discord said no')
            }
        );

        const [message] = logs.at('trace');
        expect(message).toContain('respond');
        expect(message).toContain('failed');
    });
});
