import { describe, expect, it } from 'vitest';

import { filterCirculars } from '#src/objects/filterCirculars';

describe('filterCirculars', () => {
    it('preserves shared objects and marks references on the current path', () => {
        const testValue = 42;
        const item = { id: testValue };
        const value: Record<string, unknown> = { first: item, second: item };
        value.self = value;

        expect(filterCirculars(value)).toEqual({
            first: { id: testValue },
            second: { id: testValue },
            self: '[Circular]'
        });
    });
});
