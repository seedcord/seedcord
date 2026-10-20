// measured against the real rail with every framework channel plus headroom.
// Sidebar.test re-measures, so a new rail section fails there before it clips at runtime.
export const FULL_ROWS = 30;
export const COMPACT_ROWS = 21;

// the rail at its widest, plus the columns a log line uses for its prefix and a readable message
export const RAIL_COLUMNS = 80;

export type FilterPlace = 'rail-always' | 'rail-on-f' | 'pane-on-f';
export type FilterView = 'always' | 'shown' | 'collapsed';

interface Layout {
    readonly rail: 'sidebar' | null;
    readonly header: 'line' | null;
    readonly filters: FilterPlace;
    readonly cards: boolean;
    readonly uptime: boolean;
}

const LAYOUTS = {
    full: { rail: 'sidebar', header: null, filters: 'rail-always', cards: true, uptime: true },
    compact: { rail: 'sidebar', header: null, filters: 'rail-on-f', cards: true, uptime: true },
    line: { rail: null, header: 'line', filters: 'pane-on-f', cards: false, uptime: false }
} as const satisfies Record<string, Layout>;

function layoutFor(rows: number, columns: number): Layout {
    if (columns < RAIL_COLUMNS) return LAYOUTS.line;
    if (rows >= FULL_ROWS) return LAYOUTS.full;
    if (rows >= COMPACT_ROWS) return LAYOUTS.compact;
    return LAYOUTS.line;
}

export class Screen implements Layout {
    public readonly rail: Layout['rail'];
    public readonly header: Layout['header'];
    public readonly filters: FilterPlace;
    public readonly cards: boolean;
    public readonly uptime: boolean;

    private constructor(layout: Layout) {
        this.rail = layout.rail;
        this.header = layout.header;
        this.filters = layout.filters;
        this.cards = layout.cards;
        this.uptime = layout.uptime;
    }

    public static fit(rows: number, columns: number): Screen {
        return new Screen(layoutFor(rows, columns));
    }

    public filterView(open: boolean): FilterView {
        if (this.filters === 'rail-always') return 'always';
        return open ? 'shown' : 'collapsed';
    }

    // the chips take no keys while the panel has no room to show them
    public filterKeysView(open: boolean, panelFits: boolean): FilterView {
        return this.filters === 'pane-on-f' && !panelFits ? 'collapsed' : this.filterView(open);
    }
}
