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
});
