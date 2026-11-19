import { captureLogs } from '@seedcord/logger/internal';
import { timestampFromSnowflake } from '@seedcord/utils';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { DispatchContext } from '#src/dispatch/DispatchContext';
import { DispatchTelemetry } from '#src/dispatch/DispatchTelemetry';
import { InteractionKind } from '#src/metadataKeys';
import { PublishDefault } from '#subscribers/publishDefault';
import { busWith } from '#tests/utils/busWith';

import type { Bus } from '#subscribers/Bus';
import type { SubscriptionData } from '#subscribers/types/Subscriptions';

// minted 2022-01-01, always in the past
const SNOWFLAKE = '926845371392000000';

interface Started {
    readonly telemetry: DispatchTelemetry;
    readonly dispatched: SubscriptionData<'interactionDispatched'>[];
    readonly bus: Bus;
    readonly dispatchId: string;
}

function started(
    interactionId = 'i1',
    origin: { userId: string; guildId: string | null } = { userId: 'u0', guildId: null }
): Started {
    const bus = busWith();
    const dispatched: SubscriptionData<'interactionDispatched'>[] = [];
    bus.on('interactionDispatched', (payload) => dispatched.push(payload));
    const dispatch = new DispatchContext(InteractionKind.Slash, 'ping');
    const telemetry = DispatchTelemetry.start(bus, {
        dispatch,
        interactionId,
        origin: { ...origin, channelId: null, userLocale: null, guildLocale: null }
    });
    return { telemetry, dispatched, bus, dispatchId: dispatch.id };
}

function publishDefer(bus: Bus, dispatchId: string, outcome: 'sent' | 'failed'): void {
    const write = { dispatchId, routeId: 'slash:ping', interactionId: 'i1', method: 'defer', durationMs: 1 } as const;
    bus[PublishDefault](
        'responseAttempted',
        outcome === 'sent'
            ? { ...write, outcome, messageId: null, body: null }
            : { ...write, outcome, messageId: null, body: null, error: new Error('rejected') }
    );
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('dispatch timing', () => {
    it('puts the line on the interactions channel at trace', () => {
        using logs = captureLogs();

        started().telemetry.finish('handled');

        expect(logs.records.find((record) => record.label === 'Dispatch')).toMatchObject({
            channel: 'interactions',
            level: 'trace'
        });
    });

    it('traces the route, the outcome, and the elapsed dispatch', () => {
        using logs = captureLogs();
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const { telemetry } = started();
        clock += 142;

        telemetry.finish('refused');

        const traces = logs.at('trace');
        expect(traces).toHaveLength(1);
        const [message] = traces;
        expect(message).toContain('slash:ping');
        expect(message).toContain('refused');
        expect(message).toContain('142ms');
    });
});

describe('interactionDispatched', () => {
    it('reports the route, the actor, and the time from start to finish', () => {
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const { telemetry, dispatched } = started('i1', { userId: 'u1', guildId: 'g1' });
        clock += 250;

        telemetry.finish('handled');

        expect(dispatched[0]).toMatchObject({
            routeId: 'slash:ping',
            kind: 'slash',
            userId: 'u1',
            guildId: 'g1',
            durationMs: 250
        });
    });

    it('reports the queue time measured at start', () => {
        let now = timestampFromSnowflake(SNOWFLAKE) + 1234;
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        const { telemetry, dispatched } = started(SNOWFLAKE);
        // the handler chain runs for five seconds before the report publishes
        now += 5000;

        telemetry.finish('handled');

        expect(dispatched[0]?.queuedMs).toBe(1234);
    });

    it('reports a zero queue time for an id that is not a snowflake', () => {
        const { telemetry, dispatched } = started('int-1');

        telemetry.finish('handled');

        expect(dispatched[0]?.queuedMs).toBe(0);
    });
});

describe('the slow ack warning', () => {
    it('counts from when Discord created the interaction and prints when it arrived', () => {
        vi.useFakeTimers({ now: timestampFromSnowflake(SNOWFLAKE) + 1000 });
        using logs = captureLogs();

        const { telemetry } = started(SNOWFLAKE);
        vi.advanceTimersByTime(1499);
        expect(logs.at('warn')).toEqual([]);
        vi.advanceTimersByTime(1);

        expect(logs.at('warn')).toEqual([expect.stringContaining('It reached your bot after 1s.')]);
        telemetry.finish('handled');
    });

    it.each([
        { write: 'a sent write for another dispatch', outcome: 'sent', ownDispatch: false },
        { write: 'a failed write for this dispatch', outcome: 'failed', ownDispatch: true }
    ] as const)('still warns after $write', ({ outcome, ownDispatch }) => {
        vi.useFakeTimers();
        using logs = captureLogs();
        const { telemetry, bus, dispatchId } = started();

        publishDefer(bus, ownDispatch ? dispatchId : 'another-dispatch', outcome);
        vi.advanceTimersByTime(2500);

        expect(logs.at('warn')).toEqual([expect.stringContaining('slash:ping')]);
        telemetry.finish('handled');
    });

    it('stops listening for writes once it warns', () => {
        vi.useFakeTimers();
        const { bus } = started();

        vi.advanceTimersByTime(2500);

        expect(bus.listenerCount('responseAttempted')).toBe(0);
    });
});
