export type Alignment = 'left' | 'center' | 'right';
export type BorderStyle = 'double' | 'rounded' | 'ascii' | 'markdown';
export type Overflow = 'wrap' | 'truncate';

export interface TableOptions {
    /**
     * Treats the first row as a header and draws a separator beneath it. The double frame draws that separator heavier.
     * The markdown border always carries its delimiter row. Turning this off puts a blank row above it.
     * @defaultValue true
     */
    header?: boolean;
    /**
     * Cell alignment. A scalar applies to every column. An array sets alignment per column and any column past the end of the array falls back to left.
     * @defaultValue 'left'
     */
    align?: Alignment | readonly Alignment[];
    /**
     * Frame glyph set. `markdown` emits GFM with no outer frame.
     * @defaultValue 'rounded'
     */
    border?: BorderStyle;
    /**
     * Spaces on each side of every cell.
     * @defaultValue 1
     */
    padding?: number;
    /**
     * Fills a missing or empty cell so ragged rows stay aligned.
     * @defaultValue ''
     */
    emptyCell?: string;
    /**
     * Right-aligns a column whose non-empty body cells are all numeric. The header label is not judged, so
     * a numeric column under a text header still aligns. An explicit align for that column wins.
     * @defaultValue false
     */
    numericAlign?: boolean;
    /** Max content display width applied to every column. Wider cells are wrapped or truncated. */
    maxWidth?: number;
    /**
     * How an over-wide cell is handled once maxWidth is set. `wrap` word-wraps onto multiple lines, `truncate` cuts with a trailing ellipsis.
     * A GFM cell holds one line. The markdown border truncates whatever this says.
     * @defaultValue 'wrap'
     */
    overflow?: Overflow;
    /**
     * Wraps the output in a triple-backtick code block so Discord renders it monospace. The fence
     * characters count against the page budget.
     * @defaultValue false
     */
    fence?: boolean;
}

/** {@link TableOptions} with `budget` required. The overload signal that makes renderTable return `string[]` of pages. */
export interface PagedTableOptions extends TableOptions {
    /**
     * Max characters per rendered page. The header is re-emitted on every page. Lower it to leave room
     * for surrounding text. Defaults to Discord's 2000-char message limit.
     * @defaultValue 2000
     */
    budget: number;
}
