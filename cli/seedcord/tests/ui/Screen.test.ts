import { describe, expect, it } from 'vitest';

import { MAX_RAIL } from '#ui/components/primitives/Sidebar';
import { SLIM_RAIL_WIDTH } from '#ui/components/primitives/SlimRail';
import { COMPACT_ROWS, FULL_RAIL_COLUMNS, FULL_ROWS, Screen, SLIM_RAIL_COLUMNS } from '#ui/Screen';

// the log pane beside either rail still shows a short prefix plus some of the message
const MIN_LOG_COLUMNS = 40;

const FULL = { rail: 'sidebar', filters: 'rail-always' } as const;
const COMPACT = { rail: 'sidebar', filters: 'rail-on-f' } as const;
const SLIM = { rail: 'slim', header: null, filters: 'pane-on-f', cards: true } as const;
const BAND = { rail: null, header: 'band', cards: true, uptime: true } as const;
const LINE = { rail: null, header: 'line', cards: false } as const;

describe('Screen.fit', () => {
    it('gives the full layout a roomy terminal, with the chips open whatever f says', () => {
        const screen = Screen.fit(40, 120, false);

        expect(screen).toMatchObject(FULL);
        expect(screen.filterView(false)).toBe('always');
    });

    it('collapses the filters once the rail stops fitting whole', () => {
        expect(Screen.fit(28, 120, false)).toMatchObject(COMPACT);
    });

    it('slims the rail on a terminal too narrow for the full one', () => {
        expect(Screen.fit(40, 100, false)).toMatchObject(SLIM);
    });

    it('trades the rail for the band on a narrow, tall terminal', () => {
        expect(Screen.fit(40, 79, false)).toMatchObject(BAND);
    });

    it('drops to the one-line status on a short terminal at any width', () => {
        expect(Screen.fit(19, 120, false)).toMatchObject(LINE);
    });

    it('hides the rail on s, and offers s only where a rail fits', () => {
        const hidden = Screen.fit(40, 120, true);

        expect(hidden).toMatchObject({ ...BAND, canToggleRail: true });
        expect(Screen.fit(40, 79, false).canToggleRail).toBe(false);
        expect(Screen.fit(19, 120, false).canToggleRail).toBe(false);
    });

    it('leaves the log pane room beside either rail', () => {
        expect(FULL_RAIL_COLUMNS - MAX_RAIL).toBeGreaterThanOrEqual(MIN_LOG_COLUMNS);
        expect(SLIM_RAIL_COLUMNS - SLIM_RAIL_WIDTH).toBeGreaterThanOrEqual(MIN_LOG_COLUMNS);
    });

    // the exact thresholds, so an off-by-one in any comparison fails here
    it('treats each threshold as inclusive', () => {
        expect(Screen.fit(FULL_ROWS, 120, false)).toMatchObject(FULL);
        expect(Screen.fit(COMPACT_ROWS, 120, false)).toMatchObject(COMPACT);
        expect(Screen.fit(40, FULL_RAIL_COLUMNS, false)).toMatchObject(FULL);
        expect(Screen.fit(40, SLIM_RAIL_COLUMNS, false)).toMatchObject(SLIM);
    });
});
