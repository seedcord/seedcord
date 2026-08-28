import { pageCursor } from '#pagination/cursor';
import { renderPage } from '#pagination/render';

import type { PageCursor } from '#pagination/cursor';
import type { ItemRender, PageRender } from '#pagination/render';
import type { PageSource } from '#pagination/sources';
import type { ReplyResponse } from '@seedcord/types';

/**
 * The transport-agnostic paginator configuration. Each transport adds its own handler wiring on top.
 *
 * @typeParam Item - The item type, inferred from the source.
 * @typeParam Prefix - The route prefix, inferred from `prefix`.
 * @typeParam Ctx - The transport's page context.
 */
export interface PaginatorConfig<Item, Prefix extends string, Ctx> {
    /** The route prefix used to build the page cursor on the nav buttons. */
    prefix: Prefix;
    source: PageSource<Item, Ctx>;
    /** Render one item, `index` is its absolute position across pages. Ignored when `render` is set. */
    renderItem?: ItemRender<Item>;
    /** Take over the whole page tree. Receives the page data and the controls factory. */
    render?: PageRender<Item>;
    /**
     * Whether the first page is ephemeral.
     *
     * @defaultValue `false`
     */
    ephemeral?: boolean;
}

/**
 * Holds a paginator's cursor and renders one page. Each transport extends this to add the nav handler and
 * the method that sends the first page.
 *
 * @typeParam Item - The item type, inferred from the source.
 * @typeParam Prefix - The route prefix, inferred from `config.prefix`.
 * @typeParam Ctx - The transport's page context.
 */
export abstract class PaginatorBase<Item, Prefix extends string, Ctx> {
    /** The page cursor, pass it to your `@ButtonRoute`. */
    public readonly cursor: PageCursor<Prefix>;

    protected readonly config: PaginatorConfig<Item, Prefix, Ctx>;

    protected constructor(config: PaginatorConfig<Item, Prefix, Ctx>) {
        this.cursor = pageCursor(config.prefix);
        this.config = config;
    }

    /** Build one page as a {@link ReplyResponse}. Each transport wraps this in a `page()` taking its handler. */
    protected async buildPage(ctx: Ctx, n: number): Promise<ReplyResponse> {
        const view = await this.config.source.page(ctx, n);
        return renderPage(view, this.cursor, this.config);
    }
}
