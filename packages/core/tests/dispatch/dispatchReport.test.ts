import { dispatchedPayload, InteractionRoutes } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import type { DispatchReport } from '@seedcord/core/internal';

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
