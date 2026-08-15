import { Fault, Notice, Silence } from '@seedcord/core';
import { InteractionRoutes, outcomeFor, queuedMsFor } from '@seedcord/core/internal';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { timestampFromSnowflake } from '@seedcord/utils';
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { reportDispatch } from '#src/dispatch/dispatchReport';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { SubscriptionData } from '#subscribers/types/Subscriptions';
import type { LogRecord } from '@seedcord/logger';
import type { ReplyResponse } from '@seedcord/types';

// 2022-01-01, so the gap to now is always positive
const SNOWFLAKE = '926845371392000000';

// subclassed off the package entry, so this shares the Notice identity outcomeFor reads
class Refusal extends Notice {
    constructor() {
        super('not allowed');
    }

    render(): ReplyResponse {
        return { components: [] };
    }
}

function reportFor(queuedMs = 0): Parameters<typeof reportDispatch>[1] {
    return {
        routeId: 'slash:ping',
        interactionId: 'i1',
        kind: InteractionRoutes.Slash,
        outcome: 'handled',
        fallback: false,
        startedAt: performance.now(),
        queuedMs
    };
}

// justified: the Bus only stores core, no member is read during publish
function publishedFor(report: Parameters<typeof reportDispatch>[1]): SubscriptionData<'interactionDispatched'> {
    const bus = new Bus({} as unknown as CoreBase);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    bus.on('interactionDispatched', (payload) => published.push(payload));
    reportDispatch(bus, report);
    const first = published[0];
    if (!first) throw new Error('nothing published');
    return first;
}

function traceSpy(): MockInstance<Logger['trace']> {
    return vi.spyOn(Logger.prototype, 'trace').mockImplementation(() => undefined);
}

afterEach(() => {
    vi.restoreAllMocks();
    LoggerChannelRegistry.instance.configure({});
});

describe('dispatch timing', () => {
    it('puts the line on the interactions channel at trace', () => {
        const records: LogRecord[] = [];
        LoggerChannelRegistry.instance.configure({ level: 'trace', sinks: [] });
        const handle = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: (record) => records.push(record)
        });

        publishedFor(reportFor());
        handle.dispose();

        expect(records.find((record) => record.label === 'Dispatch')).toMatchObject({
            channel: 'interactions',
            level: 'trace'
        });
    });

    it('traces the route, the outcome, and the elapsed dispatch', () => {
        const trace = traceSpy();
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const startedAt = performance.now();
        clock += 142;

        publishedFor({ ...reportFor(), startedAt });

        expect(trace).toHaveBeenCalledTimes(1);
        const message = trace.mock.calls[0]?.[0] ?? '';
        expect(message).toContain('slash:ping');
        expect(message).toContain('handled');
        expect(message).toContain('142ms');
    });

    it('traces the outcome a refused dispatch carries', () => {
        const trace = traceSpy();

        publishedFor({ ...reportFor(), outcome: 'refused' });

        expect(trace.mock.calls[0]?.[0] ?? '').toContain('refused');
    });
});

describe('reportDispatch', () => {
    it('forwards the queue time measured at entry', () => {
        const payload = publishedFor(reportFor(1234));

        expect(payload.queuedMs).toBe(1234);
        expect(payload.routeId).toBe('slash:ping');
        expect(payload.kind).toBe('slash');
    });
});

describe('durationMs', () => {
    it('measures dispatch entry until the publish', () => {
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);

        const startedAt = performance.now();
        clock += 250;
        const payload = publishedFor({ ...reportFor(), startedAt });

        expect(payload.durationMs).toBe(250);
    });
});

describe('queuedMsFor', () => {
    it('reads the queue time at dispatch entry, so a slow handler never inflates it', () => {
        const created = timestampFromSnowflake(SNOWFLAKE);
        let now = created + 1234;
        vi.spyOn(Date, 'now').mockImplementation(() => now);

        const queuedMs = queuedMsFor(SNOWFLAKE);
        // the handler chain runs for five seconds before the report publishes
        now += 5000;
        const payload = publishedFor({ ...reportFor(), queuedMs });

        expect(payload.queuedMs).toBe(1234);
    });

    it('reports a zero queue time for an id that is not a snowflake', () => {
        expect(queuedMsFor('int-1')).toBe(0);
    });
});

describe('outcomeFor', () => {
    it('calls a Silence a refusal', () => {
        expect(outcomeFor(new Silence('blacklisted'))).toBe('refused');
    });

    it('calls a plain Notice a refusal, since the user is meant to see it', () => {
        expect(outcomeFor(new Refusal())).toBe('refused');
    });

    it('calls a reporting Notice a failure', () => {
        const notice = new Refusal();
        notice.report = true;

        expect(outcomeFor(notice)).toBe('failed');
    });

    it('calls a Fault a failure, since report defaults to true', () => {
        expect(outcomeFor(new Fault({ cause: new Error('db down') }))).toBe('failed');
    });

    it('calls a Fault built with report false a refusal', () => {
        expect(outcomeFor(new Fault({ report: false }))).toBe('refused');
    });

    it('calls a raw error a failure', () => {
        expect(outcomeFor(new Error('boom'))).toBe('failed');
        expect(outcomeFor('a thrown string')).toBe('failed');
    });
});
