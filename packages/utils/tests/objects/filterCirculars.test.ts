import { describe, expect, it } from 'vitest';

import { filterCirculars } from '#src/objects/filterCirculars';

describe('filterCirculars', () => {
    it.each(['decycle', 'json'] as const)(
        'preserves shared objects and marks references on the current path in %s mode',
        (mode) => {
            const testValue = 42;
            const item = { id: testValue };
            const value: Record<string, unknown> = { first: item, second: item };
            value.self = value;

            expect(filterCirculars(value, { mode })).toEqual({
                first: { id: testValue },
                second: { id: testValue },
                self: '[Circular]'
            });
        }
    );

    it.each(['decycle', 'json'] as const)(
        'writes an invalid date as null without dropping the payload in %s mode',
        (mode) => {
            expect(filterCirculars({ when: new Date(Number.NaN), keep: 1 }, { mode })).toEqual({ when: null, keep: 1 });
        }
    );

    it.each(['decycle', 'json'] as const)(
        'keeps an own __proto__ key without changing the prototype in %s mode',
        (mode) => {
            const parsed = JSON.parse('{"__proto__":{"polluted":true},"ok":1}') as Record<string, unknown>;
            const clean = filterCirculars(parsed, { mode });

            expect(Object.hasOwn(clean, '__proto__')).toBe(true);
            expect(Object.getPrototypeOf(clean)).toBe(Object.prototype);
            expect(JSON.stringify(clean)).toBe('{"__proto__":{"polluted":true},"ok":1}');
        }
    );
});
