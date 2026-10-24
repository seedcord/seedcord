import { describe, expect, it } from 'vitest';

import { firstPages } from '#src/firstPages';

describe('how many pages a search shows', () => {
    const rows = [
        { type: 'page' as const, id: 'p1' },
        { type: 'text' as const, id: 't1' },
        { type: 'page' as const, id: 'p2' },
        { type: 'heading' as const, id: 'h1' },
        { type: 'page' as const, id: 'p3' }
    ];

    it('keeps each page rows with it', () => {
        expect(firstPages(rows, 2).map((row) => row.id)).toEqual(['p1', 't1', 'p2', 'h1']);
    });

    it('returns everything when the limit is past the count', () => {
        expect(firstPages(rows, 9)).toEqual(rows);
    });
});
