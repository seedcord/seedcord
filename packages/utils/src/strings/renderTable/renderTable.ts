import { paginate } from './pagination';
import { renderSingle } from './renderSingle';

import type { PagedTableOptions, TableOptions } from './options';

/**
 * Renders a grid of strings as a framed monospace table for Discord output.
 *
 * Column widths use display width, so emoji, astral, and CJK cells stay aligned. The first row is a
 * header by default with a separator beneath it. Ragged rows are padded to the widest row.
 *
 * Pass `budget` to get one string per page instead of a single string, splitting the body across a
 * character limit and re-emitting the header on each page.
 *
 * @param data - Rows of cells. The widest row sets the column count.
 * @param options - Rendering options, see {@link TableOptions} and {@link PagedTableOptions}.
 * @returns A single string by default, or `string[]` of pages when `budget` is set.
 *
 * @example
 * ```ts
 * renderTable([
 *     ['Name', 'Age'],
 *     ['Alice', '30'],
 *     ['Bob', '25']
 * ]);
 * // ╭───────┬─────╮
 * // │ Name  │ Age │
 * // ├───────┼─────┤
 * // │ Alice │ 30  │
 * // ├───────┼─────┤
 * // │ Bob   │ 25  │
 * // ╰───────┴─────╯
 * ```
 *
 * @example
 * `budget` returns one page per chunk, each within the limit, with the header repeated.
 * ```ts
 * const pages = renderTable(
 *     [['ID', 'Value'], ['0', 'xxxxx'], ['1', 'xxxxx'], ['2', 'xxxxx'], ['3', 'xxxxx']],
 *     { budget: 120 }
 * );
 * // pages.length is 2, and pages[0] renders as
 * // ╭────┬───────╮
 * // │ ID │ Value │
 * // ├────┼───────┤
 * // │ 0  │ xxxxx │
 * // ├────┼───────┤
 * // │ 1  │ xxxxx │
 * // ╰────┴───────╯
 * ```
 */
export function renderTable(data: readonly (readonly string[])[], options: PagedTableOptions): string[];
export function renderTable(data: readonly (readonly string[])[], options?: TableOptions): string;
export function renderTable(
    data: readonly (readonly string[])[],
    options?: TableOptions | PagedTableOptions
): string | string[] {
    if (options && 'budget' in options) return paginate(data, options);
    return renderSingle(data, options);
}
