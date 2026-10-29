import { describe, expect, it } from 'vitest';

import { isPlainObject } from '#src/objects/isPlainObject';

describe('isPlainObject', () => {
    it('accepts object literals and null-prototype objects', () => {
        expect(isPlainObject({ a: 1 })).toBe(true);
        expect(isPlainObject(Object.create(null))).toBe(true);
        expect(isPlainObject(JSON.parse('{"a":1}'))).toBe(true);
    });

    it('rejects arrays, class instances, and built-in objects', () => {
        class Point {
            public readonly x = 1;
        }
        for (const value of [[], new Point(), new Date(0), new Map(), /x/, null, 'text']) {
            expect(isPlainObject(value)).toBe(false);
        }
    });
});
