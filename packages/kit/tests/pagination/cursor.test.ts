import { describe, expect, it } from 'vitest';

import { pageCursor } from '@pagination/cursor';

describe('pageCursor', () => {
    it('round-trips a page and slot through the wire', () => {
        const cursor = pageCursor('bans');
        expect(cursor.prefix).toBe('bans');
        expect(cursor.decode(cursor.encode({ page: 7, slot: 2 }))).toEqual({ page: 7, slot: 2 });
    });

    it('packs a large page well under the 100-char wire cap', () => {
        const cursor = pageCursor('logs');
        expect(cursor.encode({ page: 4096, slot: 0 }).length).toBeLessThan(20);
    });
});
