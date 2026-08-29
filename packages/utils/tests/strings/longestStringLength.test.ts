import { describe, it, expect } from 'vitest';

import { longestStringLength } from '#src/strings/longestStringLength';

describe('longestStringLength', () => {
    it('measures the longest element as a string', () => {
        expect(longestStringLength(['ab', 12_345])).toBe(5);
        expect(longestStringLength(['alpha', 'be', 'gamma!'])).toBe(6);
    });

    it('returns zero for an empty array', () => {
        expect(longestStringLength([])).toBe(0);
    });
});
