import { describe, it, expect } from 'vitest';

import { roundToDenomination } from '#src/numbers/roundToDenomination';

describe('roundToDenomination', () => {
    it('returns a number below the first denomination unchanged', () => {
        expect(roundToDenomination(0)).toBe('0');
        expect(roundToDenomination(42)).toBe('42');
        expect(roundToDenomination(999)).toBe('999');
    });

    it('shortens from a thousand up', () => {
        expect(roundToDenomination(1000)).toBe('1K');
        expect(roundToDenomination(1234)).toBe('1.2K');
        expect(roundToDenomination(9999)).toBe('10K');
        expect(roundToDenomination(12_345)).toBe('12.3K');
    });

    it('drops the digits two values share at the given precision', () => {
        expect(roundToDenomination(1234)).toBe(roundToDenomination(1240));
    });

    it('carries to the next suffix when rounding fills the current one', () => {
        expect(roundToDenomination(999_999)).toBe('1M');
    });

    it('walks every suffix', () => {
        expect(roundToDenomination(12_345_678)).toBe('12.3M');
        expect(roundToDenomination(1_500_000_000)).toBe('1.5B');
        expect(roundToDenomination(1_500_000_000_000)).toBe('1.5T');
        expect(roundToDenomination(1_500_000_000_000_000)).toBe('1.5Q');
    });

    it('takes a precision and a suffix set', () => {
        expect(roundToDenomination(12_345_678, { precision: 2 })).toBe('12.35M');
        expect(roundToDenomination(10_000, { suffixes: ['k', 'm', 'b', 't', 'q'] })).toBe('10k');
    });

    it('takes a suffix list of any length', () => {
        expect(roundToDenomination(2500, { suffixes: ['k'] })).toBe('2.5k');
        expect(roundToDenomination(12_345_678, { suffixes: ['k', 'm'] })).toBe('12.3m');
        expect(roundToDenomination(2_500_000_000_000_000, { suffixes: ['K', 'M', 'B', 'T', 'Q', 'Qi'] })).toBe('2.5Q');
    });

    it('stops shortening past the last suffix it was given', () => {
        expect(roundToDenomination(12_345_678, { suffixes: ['k'] })).toBe('12345.7k');
    });

    it('preserves a rounded decimal that ends in .9', () => {
        expect(roundToDenomination(1900)).toBe('1.9K');
    });

    it('formats higher precision without trailing zeroes', () => {
        expect(roundToDenomination(1005, { precision: 2 })).toBe('1.01K');
        expect(roundToDenomination(1000, { precision: 2 })).toBe('1K');
        expect(roundToDenomination(12_345_678, { precision: 2 })).toBe('12.35M');
    });

    it('does not emit undefined when rounding reaches 1000 at the last suffix', () => {
        expect(roundToDenomination(999_999, { suffixes: ['K'] })).toBe('1000K');
    });

    it('does not emit undefined past the built-in suffix list', () => {
        expect(roundToDenomination(1e18)).toBe('1000Q');
    });

    it('preserves large values past the last suffix at high precision', () => {
        expect(roundToDenomination(1e9, { suffixes: ['K'], precision: 15 })).toBe('1000000K');
    });

    it('keeps fractional digits at high precision for ordinary magnitudes', () => {
        expect(roundToDenomination(12_345, { precision: 15 })).toBe('12.345K');
    });

    it('throws RangeError for invalid precision', () => {
        expect(() => roundToDenomination(1234, { precision: -1 })).toThrow(RangeError);
        expect(() => roundToDenomination(1234, { precision: 101 })).toThrow(RangeError);
        expect(() => roundToDenomination(1234, { precision: Number.NaN })).toThrow(RangeError);
    });
});
