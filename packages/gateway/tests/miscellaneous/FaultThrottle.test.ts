import { describe, expect, it } from 'vitest';

import { FaultThrottle } from '@miscellaneous/FaultThrottle';

describe('FaultThrottle', () => {
    it('reports a fresh key, then drops a duplicate within the window', () => {
        let now = 1000;
        const throttle = new FaultThrottle(60_000, () => now);

        expect(throttle.shouldReport('k')).toBe(true);
        throttle.markReported('k');

        now += 30_000;
        expect(throttle.shouldReport('k')).toBe(false);
    });

    it('reports again once the window elapses', () => {
        let now = 1000;
        const throttle = new FaultThrottle(60_000, () => now);

        expect(throttle.shouldReport('k')).toBe(true);
        throttle.markReported('k');

        now += 61_000;
        expect(throttle.shouldReport('k')).toBe(true);
    });

    it('throttles distinct keys independently', () => {
        const now = 1000;
        const throttle = new FaultThrottle(60_000, () => now);

        throttle.markReported('a');

        expect(throttle.shouldReport('a')).toBe(false);
        expect(throttle.shouldReport('b')).toBe(true);
    });
});
