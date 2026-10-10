import { describe, expect, it } from 'vitest';

import { filterCirculars } from '#src/objects/filterCirculars';

describe('filterCirculars', () => {
    it('preserves shared objects and marks references on the current path', () => {
        const item = { id: 42 };
        const value: Record<string, unknown> = { first: item, second: item };
        value.self = value;

        expect(filterCirculars(value)).toEqual({
            first: { id: 42 },
            second: { id: 42 },
            self: '[Circular]'
        });
    });
});
