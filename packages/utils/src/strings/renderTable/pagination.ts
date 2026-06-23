import { renderSingle } from './renderSingle';

import type { PagedTableOptions } from './options';

const DEFAULT_BUDGET = 2000;

export function paginate(data: readonly (readonly string[])[], options: PagedTableOptions): string[] {
    if (data.length === 0) return [];

    const { budget = DEFAULT_BUDGET, ...tableOptions } = options;
    const header = tableOptions.header === false ? undefined : data[0];
    const body = header ? data.slice(1) : data;

    const render = (rows: readonly (readonly string[])[]): string =>
        renderSingle(header ? [header, ...rows] : rows, tableOptions);

    if (body.length === 0) return [render([])];

    const pages: string[] = [];
    let current: (readonly string[])[] = [];

    for (const row of body) {
        // an empty page always takes the row, since a page smaller than one body row cannot exist
        if (current.length === 0 || render([...current, row]).length <= budget) {
            current.push(row);
            continue;
        }
        pages.push(render(current));
        current = [row];
    }

    pages.push(render(current));
    return pages;
}
