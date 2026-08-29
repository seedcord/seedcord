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
});
