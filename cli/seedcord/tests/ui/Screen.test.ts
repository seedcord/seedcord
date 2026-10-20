import { describe, expect, it } from 'vitest';

import { MAX_RAIL } from '#ui/components/primitives/Sidebar';
import { COMPACT_ROWS, FULL_ROWS, RAIL_COLUMNS, Screen } from '#ui/Screen';

// the log pane beside the widest rail still shows a short prefix plus some of the message
const MIN_LOG_COLUMNS = 40;

const FULL = { rail: 'sidebar', filters: 'rail-always' } as const;
const COMPACT = { rail: 'sidebar', filters: 'rail-on-f' } as const;
const LINE = { rail: null, header: 'line', cards: false } as const;

describe('Screen.fit', () => {
    it('gives the full layout a roomy terminal, with the chips open whatever f says', () => {
        const screen = Screen.fit(40, 120);

        expect(screen).toMatchObject(FULL);
        expect(screen.filterView(false)).toBe('always');
    });

    it('collapses the filters once the rail stops fitting whole', () => {
        expect(Screen.fit(28, 120)).toMatchObject(COMPACT);
    });

    it('drops the rail once the collapsed form stops fitting', () => {
        expect(Screen.fit(19, 120)).toMatchObject(LINE);
    });

    it('drops the rail on a narrow terminal at any height', () => {
        expect(Screen.fit(40, 79)).toMatchObject(LINE);
    });

    // the rail is capped at MAX_RAIL, so the column threshold has to leave a log line room beside it
    it('leaves the log pane room beside the widest rail', () => {
        expect(RAIL_COLUMNS - MAX_RAIL).toBeGreaterThanOrEqual(MIN_LOG_COLUMNS);
    });

    // the exact thresholds, so an off-by-one in any comparison fails here
    it('treats each threshold as inclusive', () => {
        expect(Screen.fit(FULL_ROWS, 120)).toMatchObject(FULL);
        expect(Screen.fit(COMPACT_ROWS, 120)).toMatchObject(COMPACT);
        expect(Screen.fit(40, RAIL_COLUMNS)).toMatchObject(FULL);
    });
});
