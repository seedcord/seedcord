export type FilterGroup = 'channels' | 'levels';
export type CursorMove = 'left' | 'right' | 'up' | 'down';

// one remembered index per group, kept across group switches
export interface FilterCursor {
    readonly group: FilterGroup;
    readonly channels: number;
    readonly levels: number;
}

export const INITIAL_CURSOR: FilterCursor = { group: 'channels', channels: 0, levels: 0 };

export function moveCursor(
    cursor: FilterCursor,
    move: CursorMove,
    channelCount: number,
    levelCount: number
): FilterCursor {
    if (move === 'up' || move === 'down') {
        return { ...cursor, group: cursor.group === 'channels' ? 'levels' : 'channels' };
    }

    const count = cursor.group === 'channels' ? channelCount : levelCount;
    if (count === 0) return cursor;

    const index = cursor.group === 'channels' ? cursor.channels : cursor.levels;
    const next = move === 'right' ? (index + 1) % count : (index + count - 1) % count;
    return cursor.group === 'channels' ? { ...cursor, channels: next } : { ...cursor, levels: next };
}

// modulo, a remembered index can exceed the count after the channel list shrinks
export function focusedIn(cursor: FilterCursor | null, group: FilterGroup, count: number): number | null {
    if (cursor?.group !== group || count === 0) return null;
    return (group === 'channels' ? cursor.channels : cursor.levels) % count;
}
