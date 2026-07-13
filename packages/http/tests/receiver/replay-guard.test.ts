import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReplayGuard } from '@src/receiver/ReplayGuard';

const WINDOW_MS = 300_000;
const BASE = 1_752_350_000_000;

const seconds = (ms: number): string => String(Math.floor(ms / 1000));

describe('ReplayGuard', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(BASE);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('accepts a signature stamped now', () => {
        const guard = new ReplayGuard();

        expect(guard.accepts('sig-a', seconds(BASE))).toBe(true);
    });

    it('accepts a timestamp at the stale edge of the window', () => {
        const guard = new ReplayGuard();

        expect(guard.accepts('sig-a', seconds(BASE - WINDOW_MS))).toBe(true);
    });

    it('rejects a timestamp older than the window', () => {
        const guard = new ReplayGuard();

        expect(guard.accepts('sig-a', seconds(BASE - WINDOW_MS - 1000))).toBe(false);
    });

    it('accepts a future timestamp within the window', () => {
        const guard = new ReplayGuard();

        expect(guard.accepts('sig-a', seconds(BASE + WINDOW_MS - 1000))).toBe(true);
    });

    it('rejects a future timestamp beyond the window', () => {
        const guard = new ReplayGuard();

        expect(guard.accepts('sig-a', seconds(BASE + WINDOW_MS + 1000))).toBe(false);
    });

    it.each([
        ['letters', 'abc'],
        ['decimal', '12.5'],
        ['negative', '-1752350000'],
        ['empty', '']
    ])('rejects a non-integer timestamp (%s)', (_label, timestamp) => {
        const guard = new ReplayGuard();

        expect(guard.accepts('sig-a', timestamp)).toBe(false);
    });

    it('rejects a repeated signature inside the window', () => {
        const guard = new ReplayGuard();
        const timestamp = seconds(BASE);

        expect(guard.accepts('sig-a', timestamp)).toBe(true);
        expect(guard.accepts('sig-a', timestamp)).toBe(false);
    });

    it('rejects a replay of a timestamp at the stale edge', () => {
        const guard = new ReplayGuard();
        const timestamp = seconds(BASE - WINDOW_MS);

        expect(guard.accepts('sig-a', timestamp)).toBe(true);
        expect(guard.accepts('sig-a', timestamp)).toBe(false);
    });

    it('tracks signatures independently', () => {
        const guard = new ReplayGuard();
        const timestamp = seconds(BASE);

        expect(guard.accepts('sig-a', timestamp)).toBe(true);
        expect(guard.accepts('sig-b', timestamp)).toBe(true);
    });

    it('sweeps expired entries on access and re-accepts a swept signature', () => {
        const guard = new ReplayGuard();
        // justified: the sweep is unobservable through accepts(), so the test reads the private map
        const seen = Reflect.get(guard, 'seen') as Map<string, number>;

        expect(guard.accepts('sig-a', seconds(BASE))).toBe(true);
        expect(seen.size).toBe(1);

        vi.setSystemTime(BASE + WINDOW_MS * 2);
        expect(guard.accepts('sig-a', seconds(BASE + WINDOW_MS * 2))).toBe(true);
        expect(seen.size).toBe(1);
    });
});
