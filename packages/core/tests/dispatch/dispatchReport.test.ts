import { Fault, Notice, Silence } from '@seedcord/core';
import { dispatchedPayload, InteractionRoutes, outcomeFor, queuedMsFor } from '@seedcord/core/internal';
import { timestampFromSnowflake } from '@seedcord/utils';
import { describe, expect, it, vi } from 'vitest';

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

function reportFor(queuedMs = 0): Parameters<typeof dispatchedPayload>[0] {
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

describe('dispatchedPayload', () => {
    it('forwards the queue time measured at entry', () => {
        const payload = dispatchedPayload(reportFor(1234));

        expect(payload.queuedMs).toBe(1234);
        expect(payload.routeId).toBe('slash:ping');
        expect(payload.kind).toBe('slash');
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
        const payload = dispatchedPayload({ ...reportFor(), queuedMs });

        expect(payload.queuedMs).toBe(1234);
        vi.restoreAllMocks();
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
