import { describe, expect, it } from 'vitest';

import { includesIgnoreCase, plural } from '@core/format';

describe('includesIgnoreCase', () => {
    it('matches a substring regardless of case on either side', () => {
        expect(includesIgnoreCase('My Guild', 'guild')).toBe(true);
        expect(includesIgnoreCase('my guild', 'GUILD')).toBe(true);
        expect(includesIgnoreCase('ABC123', 'abc')).toBe(true);
    });

    it('treats an empty or whitespace search as a match', () => {
        expect(includesIgnoreCase('anything', '')).toBe(true);
        expect(includesIgnoreCase('anything', '   ')).toBe(true);
    });

    it('is false when the substring is absent', () => {
        expect(includesIgnoreCase('My Guild', 'zzz')).toBe(false);
    });
});

describe('plural', () => {
    it('uses the singular noun for a count of 1', () => {
        expect(plural(1, 'guild')).toBe('1 guild');
    });

    it('uses the plural noun for 0 and many', () => {
        expect(plural(0, 'guild')).toBe('0 guilds');
        expect(plural(4, 'guild')).toBe('4 guilds');
    });

    it('takes an explicit plural form for irregular nouns', () => {
        expect(plural(2, 'entry', 'entries')).toBe('2 entries');
    });
});
