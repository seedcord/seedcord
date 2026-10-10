import { describe, expect, it } from 'vitest';

import { isStringArray } from '#src/objects/isStringArray';

describe('isStringArray', () => {
    it('accepts only string arrays', () => {
        expect(isStringArray(['a', 'b'])).toBe(true);
        expect(isStringArray([])).toBe(true);
        expect(isStringArray(['a', 1])).toBe(false);
        expect(isStringArray('a')).toBe(false);
    });
});
