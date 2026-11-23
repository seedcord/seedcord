import { describe, it, expect } from 'vite-plus/test';

import { parseDuration } from '#src/numbers/parseDuration';
import { acceptedDurations, rejectedDurations } from '#tests/numbers/durations';

describe('parseDuration', () => {
    it('parses each supported unit into milliseconds', () => {
        expect(parseDuration('500ms')).toBe(500);
        expect(parseDuration('90s')).toBe(90_000);
        expect(parseDuration('30m')).toBe(1_800_000);
        expect(parseDuration('24h')).toBe(86_400_000);
        expect(parseDuration('7d')).toBe(604_800_000);
        expect(parseDuration('120s')).toBe(120_000);
    });

    it.each(acceptedDurations)('accepts %j, the same as ValidDuration', (duration) => {
        expect(parseDuration(duration)).toBeGreaterThan(0);
    });

    it.each(rejectedDurations)('returns null for %j, the same as ValidDuration', (duration) => {
        expect(parseDuration(duration)).toBeNull();
    });

    it('returns null for a number too big to count in milliseconds', () => {
        expect(parseDuration(`${'9'.repeat(400)}ms`)).toBeNull();
        expect(parseDuration('9007199254740992ms')).toBeNull();
    });
});
