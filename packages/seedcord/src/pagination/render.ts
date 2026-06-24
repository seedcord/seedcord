import { BuilderComponent } from '@seedcord/kit';
import { TextDisplayBuilder } from 'discord.js';

import { Controls } from './controls';

import type { ControlKey, PaginatorControls } from './controls';
import type { PageView } from '@seedcord/kit';
import type { PageCursor } from '@seedcord/kit/internal';
import type { ReplyResponse, V2Component } from '@seedcord/types';
import type { ButtonBuilder, ActionRowBuilder } from 'discord.js';

/** What `renderItem` returns for one item, a text line or a section. */
export type ItemRender<Item> = (item: Item, index: number) => string | BuilderComponent<'section'>;

/** What the V2 reply can be built from. Each arm is normalized into a {@link ReplyResponse}. */
type Renderable = string | V2Component[] | ReplyResponse;

/** A full-page render override, handed the page data and the controls factory. */
export type PageRender<Item> = (view: PageView<Item>, controls: PaginatorControls) => Renderable;

// subclassed because BuilderComponent.instance is protected, so the assembly has to happen inside.
class PageContainer<Item> extends BuilderComponent<'container'> {
    constructor(view: PageView<Item>, renderItem: ItemRender<Item>, controlRow: ActionRowBuilder<ButtonBuilder>) {
        super('container');
        const base = view.page * view.perPage;
        let lines: string[] = [];
        const flush = (): void => {
            if (lines.length === 0) return;
            this.instance.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
            lines = [];
        };
        view.items.forEach((item, offset) => {
            const rendered = renderItem(item, base + offset);
            if (typeof rendered === 'string') {
                lines.push(rendered);
                return;
            }
            flush();
            this.instance.addSectionComponents(rendered.component);
        });
        flush();
        this.instance.addActionRowComponents(controlRow);
    }
}

function toReplyResponse(renderable: Renderable): ReplyResponse {
    if (typeof renderable === 'string') return { components: [new TextDisplayBuilder().setContent(renderable)] };
    if (Array.isArray(renderable)) return { components: renderable };
    return renderable;
}

const ARRAY_KEYS: ControlKey[] = ['first', 'prev', 'indicator', 'next', 'last'];
const CURSOR_KEYS: ControlKey[] = ['prev', 'indicator', 'next'];

/**
 * Build a page's V2 reply. A `render` override builds the whole tree, otherwise the default container lists
 * the items and appends the controls (all five for a known total, prev/indicator/next for a cursor source).
 */
export function renderPage<Item>(
    view: PageView<Item>,
    cursor: PageCursor<string>,
    config: { renderItem?: ItemRender<Item>; render?: PageRender<Item> }
): ReplyResponse {
    const controls = new Controls(cursor, view);
    if (config.render) return toReplyResponse(config.render(view, controls));

    const renderItem = config.renderItem ?? ((item: Item): string => String(item));
    const row = controls.row(...(view.totalPages === undefined ? CURSOR_KEYS : ARRAY_KEYS));
    return { components: [new PageContainer(view, renderItem, row).component] };
}
