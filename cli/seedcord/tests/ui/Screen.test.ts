import { describe, expect, it } from 'vitest';

import { COMPACT_ROWS, FULL_ROWS, Screen } from '#ui/Screen';

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

    it('treats each threshold as inclusive', () => {
        expect(Screen.fit(FULL_ROWS, 120, false)).toMatchObject(FULL);
        expect(Screen.fit(COMPACT_ROWS, 120, false)).toMatchObject(COMPACT);
        expect(Screen.fit(40, 119, false)).toMatchObject(SLIM);
        expect(Screen.fit(40, 80, false)).toMatchObject(SLIM);
        expect(Screen.fit(40, 79, false)).toMatchObject(BAND);
    });
});
