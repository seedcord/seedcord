// measured against the real rail with every framework channel.
// Sidebar.test re-measures them.
export const FULL_ROWS = 32;
export const COMPACT_ROWS = 23;

// i picked these by trial-n-error
// make sure to do that again if changing
const FULL_RAIL_COLUMNS = 120;
const SLIM_RAIL_COLUMNS = 80;

export type FilterPlace = 'rail-always' | 'rail-on-f' | 'pane-on-f';
export type FilterView = 'always' | 'shown' | 'collapsed';

interface Layout {
    readonly rail: 'sidebar' | 'slim' | null;
    readonly header: 'band' | 'line' | null;
    readonly filters: FilterPlace;
    readonly cards: boolean;
    readonly uptime: boolean;
}

const LAYOUTS = {
    full: { rail: 'sidebar', header: null, filters: 'rail-always', cards: true, uptime: true },
    compact: { rail: 'sidebar', header: null, filters: 'rail-on-f', cards: true, uptime: true },
    slim: { rail: 'slim', header: null, filters: 'pane-on-f', cards: true, uptime: true },
    band: { rail: null, header: 'band', filters: 'pane-on-f', cards: true, uptime: true },
    line: { rail: null, header: 'line', filters: 'pane-on-f', cards: false, uptime: false }
} as const satisfies Record<string, Layout>;

function railLayoutFor(rows: number, columns: number, showRail: boolean): Layout {
    if (!showRail) return LAYOUTS.band;
    if (columns < FULL_RAIL_COLUMNS) return LAYOUTS.slim;
    return rows >= FULL_ROWS ? LAYOUTS.full : LAYOUTS.compact;
}

export class Screen implements Layout {
    public readonly rail: Layout['rail'];
    public readonly header: Layout['header'];
    public readonly filters: FilterPlace;
    public readonly cards: boolean;
    public readonly uptime: boolean;
    public readonly canToggleRail: boolean;

    private constructor(layout: Layout, canToggleRail: boolean) {
        this.rail = layout.rail;
        this.header = layout.header;
        this.filters = layout.filters;
        this.cards = layout.cards;
        this.uptime = layout.uptime;
        this.canToggleRail = canToggleRail;
    }

    public static fit(rows: number, columns: number, railHidden: boolean): Screen {
        if (rows < COMPACT_ROWS) return new Screen(LAYOUTS.line, false);
        const canToggleRail = columns >= SLIM_RAIL_COLUMNS;
        return new Screen(railLayoutFor(rows, columns, canToggleRail && !railHidden), canToggleRail);
    }

    public filterView(open: boolean): FilterView {
        if (this.filters === 'rail-always') return 'always';
        return open ? 'shown' : 'collapsed';
    }

    public filterKeysView(open: boolean, panelFits: boolean): FilterView {
        return this.filters === 'pane-on-f' && !panelFits ? 'collapsed' : this.filterView(open);
    }
}
