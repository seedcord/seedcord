import { describe, expect, it } from 'vitest';

import { MAX_RAIL } from '#ui/components/primitives/Sidebar';
import { COMPACT_ROWS, FULL_ROWS, RAIL_COLUMNS, tierFor } from '#ui/tier';

// a log line spends about 28 columns on its prefix, and a message needs a dozen more to read
const MIN_LOG_COLUMNS = 40;

describe('tierFor', () => {
    it('gives the full layout a roomy terminal', () => {
        expect(tierFor(40, 120)).toBe('full');
    });

    it('collapses the filters once the rail stops fitting whole', () => {
        expect(tierFor(28, 120)).toBe('compact');
    });

    it('drops the rail once the collapsed form stops fitting', () => {
        expect(tierFor(19, 120)).toBe('logs');
    });

    it('drops the rail on a narrow terminal at any height', () => {
        expect(tierFor(40, 79)).toBe('logs');
    });

    // the rail is capped at MAX_RAIL, so the column threshold has to leave a log line room beside it
    it('leaves the log pane room beside the widest rail', () => {
        expect(RAIL_COLUMNS - MAX_RAIL).toBeGreaterThanOrEqual(MIN_LOG_COLUMNS);
    });

    // the exact thresholds, so an off-by-one in any comparison fails here
    it('treats each threshold as inclusive', () => {
        expect(tierFor(FULL_ROWS, 120)).toBe('full');
        expect(tierFor(COMPACT_ROWS, 120)).toBe('compact');
        expect(tierFor(40, RAIL_COLUMNS)).toBe('full');
    });
});
