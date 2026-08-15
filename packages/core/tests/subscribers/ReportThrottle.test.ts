import { describe, expect, it } from 'vitest';

import { ReportThrottle } from '#subscribers/ReportThrottle';

describe('ReportThrottle', () => {
    it('sends a fresh key with nothing suppressed behind it', () => {
        const throttle = new ReportThrottle(60_000, () => 1000);

        expect(throttle.take('k')).toBe(0);
    });

    it('sends nothing inside the window', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        throttle.take('k');
        now += 30_000;

        expect(throttle.take('k')).toBeNull();
    });

    it('carries the count of everything it suppressed into the next send', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        throttle.take('k');
        throttle.take('k');
        throttle.take('k');
        now += 61_000;

        expect(throttle.take('k')).toBe(2);
    });

    it('starts counting again after a send', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        throttle.take('k');
        throttle.take('k');
        now += 61_000;
        throttle.take('k');
        now += 61_000;

        expect(throttle.take('k')).toBe(0);
    });

    it('counts each key on its own', () => {
        const throttle = new ReportThrottle(60_000, () => 1000);

        throttle.take('a');

        expect(throttle.take('a')).toBeNull();
        expect(throttle.take('b')).toBe(0);
    });

    it('counts the event whose own card never sent', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        const suppressed = throttle.take('k');
        throttle.restore('k', suppressed ?? 0);
        now += 61_000;

        expect(throttle.take('k')).toBe(1);
    });

    it('keeps the window shut after a failed send, so a dead webhook is tried once a minute', () => {
        const throttle = new ReportThrottle(60_000, () => 1000);

        const suppressed = throttle.take('k');
        throttle.restore('k', suppressed ?? 0);

        expect(throttle.take('k')).toBeNull();
    });

    it('keeps a newer window shut when an older send fails late, and still counts it', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        const stale = throttle.take('k');
        now += 61_000;
        throttle.take('k');
        throttle.restore('k', stale ?? 0);

        expect(throttle.take('k')).toBeNull();
        now += 61_000;
        // one from the late restore, one from the take above it
        expect(throttle.take('k')).toBe(2);
    });

    it('hands a failed send its count back, so the next one carries it', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        throttle.take('k');
        throttle.take('k');
        throttle.take('k');
        now += 61_000;
        const suppressed = throttle.take('k');
        throttle.restore('k', suppressed ?? 0);
        now += 61_000;

        expect(suppressed).toBe(2);
        expect(throttle.take('k')).toBe(3);
    });

    it('adds what arrived during a failed send to the restored count', () => {
        let now = 1000;
        const throttle = new ReportThrottle(60_000, () => now);

        throttle.take('k');
        now += 61_000;
        throttle.take('k');
        throttle.take('k');
        throttle.restore('k', 5);
        now += 61_000;

        expect(throttle.take('k')).toBe(7);
    });
});
