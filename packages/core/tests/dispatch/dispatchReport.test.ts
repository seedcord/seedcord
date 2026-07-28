import { Fault, Notice, Silence } from '@seedcord/core';
import { dispatchedPayload, InteractionRoutes, outcomeFor } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import type { DispatchReport } from '@seedcord/core/internal';
import type { ReplyResponse } from '@seedcord/types';

// subclassed off the package entry, so this shares the Notice identity outcomeFor reads
class Refusal extends Notice {
    constructor() {
        super('not allowed');
    }

    render(): ReplyResponse {
        return { components: [] };
    }
}

function reportFor(interactionId: string): DispatchReport {
    return {
        routeId: 'slash:ping',
        kind: InteractionRoutes.Slash,
        outcome: 'handled',
        fallback: false,
        startedAt: performance.now(),
        interactionId
    };
}

describe('dispatchedPayload', () => {
    it('reads the queue time off the interaction snowflake', () => {
        // 2022-01-01, so the gap to now is always positive
        const payload = dispatchedPayload(reportFor('926845371392000000'));

        expect(payload.queuedMs).toBeGreaterThan(0);
        expect(payload.routeId).toBe('slash:ping');
        expect(payload.kind).toBe('slash');
    });

    it('reports a zero queue time for an id that is not a snowflake, rather than throwing', () => {
        expect(dispatchedPayload(reportFor('int-1')).queuedMs).toBe(0);
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
