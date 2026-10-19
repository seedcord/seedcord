import { describe, expect, it } from 'vitest';

import { ordinal } from '#src/numbers/ordinal';

describe('ordinal', () => {
    it('suffixes each number by its last two digits', () => {
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map((n) => ordinal(n))).toEqual([
            '1st',
            '2nd',
            '3rd',
            '4th',
            '11th',
            '12th',
            '13th',
            '21st',
            '22nd',
            '23rd',
            '101st',
            '111th'
        ]);
    });

    it('suffixes a negative by its magnitude', () => {
        expect([-1, -2, -3, -11, -21].map((n) => ordinal(n))).toEqual(['-1st', '-2nd', '-3rd', '-11th', '-21st']);
    });
});
