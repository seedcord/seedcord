import { describe, it, expect } from 'vitest';

import { parseDuration } from '#src/numbers/parseDuration';

describe('parseDuration', () => {
    it('parses each supported unit into milliseconds', () => {
        expect(parseDuration('500ms')).toBe(500);
        expect(parseDuration('90s')).toBe(90_000);
        expect(parseDuration('30m')).toBe(1_800_000);
        expect(parseDuration('24h')).toBe(86_400_000);
        expect(parseDuration('7d')).toBe(604_800_000);
    });

    it('parses a multi-digit value', () => {
        expect(parseDuration('120s')).toBe(120_000);
    });

    it('returns null for a bare number with no unit', () => {
        expect(parseDuration('24')).toBeNull();
    });

    it('returns null for an unknown unit', () => {
        expect(parseDuration('5y')).toBeNull();
        expect(parseDuration('10w')).toBeNull();
    });

    it('returns null for a malformed or empty string', () => {
        expect(parseDuration('')).toBeNull();
        expect(parseDuration('h')).toBeNull();
        expect(parseDuration('abc')).toBeNull();
        expect(parseDuration('24hh')).toBeNull();
    });

    it('returns null for an uppercase unit', () => {
        expect(parseDuration('24H')).toBeNull();
    });

    it('returns null when the input has surrounding whitespace', () => {
        expect(parseDuration('24 h')).toBeNull();
        expect(parseDuration(' 24h')).toBeNull();
        expect(parseDuration('24h ')).toBeNull();
    });

    it('returns null for a fractional value', () => {
        expect(parseDuration('1.5h')).toBeNull();
    });

    it('returns null for a zero duration so a result is never 0', () => {
        expect(parseDuration('0h')).toBeNull();
        expect(parseDuration('0s')).toBeNull();
    });
});
