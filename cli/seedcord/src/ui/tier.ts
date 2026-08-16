/** How much of the dev UI the terminal has room for. */
export type Tier = 'full' | 'compact' | 'logs';

// measured against the real rail with every framework channel plus headroom. Sidebar.test re-measures, so a
// new rail section fails there before it clips at runtime.
export const FULL_ROWS = 30;
export const COMPACT_ROWS = 21;

// the rail at its widest, plus the columns a log line uses for its prefix and a readable message
export const RAIL_COLUMNS = 80;

export function tierFor(rows: number, columns: number): Tier {
    if (columns < RAIL_COLUMNS) return 'logs';
    if (rows >= FULL_ROWS) return 'full';
    if (rows >= COMPACT_ROWS) return 'compact';
    return 'logs';
}
