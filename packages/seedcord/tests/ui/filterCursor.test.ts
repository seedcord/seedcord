import { describe, expect, it } from 'vitest';

import { focusedIn, INITIAL_CURSOR, moveCursor } from '@ui/filterCursor';

describe('moveCursor', () => {
    it('moves right within channels and wraps', () => {
        let cursor = moveCursor(INITIAL_CURSOR, 'right', 3, 5);
        expect(cursor.channels).toBe(1);
        cursor = moveCursor(moveCursor(cursor, 'right', 3, 5), 'right', 3, 5);
        expect(cursor.channels).toBe(0);
    });

    it('moves left within channels and wraps', () => {
        expect(moveCursor(INITIAL_CURSOR, 'left', 3, 5).channels).toBe(2);
    });

    it('switches groups on up/down and keeps each index', () => {
        let cursor = moveCursor(INITIAL_CURSOR, 'right', 3, 5); // channels 1
        cursor = moveCursor(cursor, 'down', 3, 5);
        expect(cursor.group).toBe('levels');
        cursor = moveCursor(cursor, 'right', 3, 5); // levels 1
        cursor = moveCursor(cursor, 'up', 3, 5);
        expect(cursor.group).toBe('channels');
        expect(cursor.channels).toBe(1);
        expect(cursor.levels).toBe(1);
    });

    it('holds still in an empty group', () => {
        expect(moveCursor(INITIAL_CURSOR, 'right', 0, 5)).toEqual(INITIAL_CURSOR);
    });
});

describe('focusedIn', () => {
    it('returns the index for the active group', () => {
        expect(focusedIn(INITIAL_CURSOR, 'channels', 3)).toBe(0);
    });

    it('returns null for the inactive group', () => {
        expect(focusedIn(INITIAL_CURSOR, 'levels', 5)).toBeNull();
    });

    it('returns null for a null cursor', () => {
        expect(focusedIn(null, 'channels', 3)).toBeNull();
    });

    it('returns null when the count is 0', () => {
        expect(focusedIn(INITIAL_CURSOR, 'channels', 0)).toBeNull();
    });

    it('wraps a remembered index past the current count', () => {
        const cursor = { group: 'channels', channels: 7, levels: 0 } as const;
        expect(focusedIn(cursor, 'channels', 3)).toBe(1); // 7 % 3, a clamp would give 2
    });
});
