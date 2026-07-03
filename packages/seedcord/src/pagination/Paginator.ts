import { pageCursor } from '@seedcord/core/internal';

import { ReplySender } from '@bot/ReplySender';
import { ButtonHandler } from '@handlers/interaction/components';

import { renderPage } from './render';

import type { PageContext } from './PageContext';
import type { ItemRender, PageRender } from './render';
import type { PageSource } from './sources';
import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { PageCursor } from '@seedcord/core/internal';
import type { ReplyResponse } from '@seedcord/types';
import type { ButtonInteraction, Message } from 'discord.js';

interface PaginatorConfig<Item, Prefix extends string> {
    /** The route prefix used to build the page cursor on the nav buttons. */
    prefix: Prefix;
    /** Where the page data comes from. */
    source: PageSource<Item>;
    /** Render one item, `index` is its absolute position across pages. Ignored when `render` is set. */
    renderItem?: ItemRender<Item>;
    /** Take over the whole page tree. Receives the page data and the controls factory. */
    render?: PageRender<Item>;
    /** Whether the first page is ephemeral. {@default false} */
    ephemeral?: boolean;
}

// `& { execute }` concretizes the abstract execute so the empty `extends Bans.Handler {}` stays concrete
// (no TS2515) and a concrete Nav assigns with no cast.
type PaginatorHandlerCtor<Prefix extends string> = new (
    event: ButtonInteraction<'cached'>,
    core: Core
) => ButtonHandler<[PageCursor<Prefix>]> & { execute(): Promise<void> };

function contextOf(interaction: Repliables, core?: Core): PageContext {
    return { interaction, user: interaction.user, guild: interaction.guild, ...(core && { core }) };
}

/**
 * A restart-proof paginator. Each nav button's customId encodes its full target page, so clicks are
 * idempotent and survive a restart. A persistent `@ButtonRoute` on `Handler` dispatches the clicks.
 *
 * @typeParam Item - The item type, inferred from the source.
 * @typeParam Prefix - The route prefix, inferred from `config.prefix`.
 *
 * @example
 * ```ts
 * export const Bans = new Paginator({
 *     prefix: 'bans',
 *     source: new ArraySource((ctx) => ctx.guild.bans.fetch().then((b) => [...b.values()]), { perPage: 10 }),
 *     renderItem: (ban) => ban.user.tag
 * });
 *
 * \@ButtonRoute(Bans.cursor)
 * export class BansNav extends Bans.Handler {}
 * ```
 */
export class Paginator<Item, const Prefix extends string> {
    /** The page cursor, pass it to your `@ButtonRoute`. */
    public readonly cursor: PageCursor<Prefix>;
    /** The nav handler base. Extend it with an empty body and decorate it, `@ButtonRoute(p.cursor)`. */
    public readonly Handler: PaginatorHandlerCtor<Prefix>;

    private readonly config: PaginatorConfig<Item, Prefix>;

    constructor(config: PaginatorConfig<Item, Prefix>) {
        this.cursor = pageCursor(config.prefix);
        this.config = config;

        // an arrow captures the paginator lexically so Nav.execute can reach it without aliasing `this`.
        const loadPage = (ctx: PageContext, n: number): Promise<ReplyResponse> => this.page(ctx, n);
        this.Handler = class Nav extends ButtonHandler<[PageCursor<Prefix>]> {
            async execute(): Promise<void> {
                await this.event.deferUpdate();
                const response = await loadPage(contextOf(this.event, this.core), this.params.page);
                await new ReplySender(this.event).edit(this.event.message, response);
            }
        };
    }

    /** Render page 0 and send it, picking reply or followUp from the interaction's state. */
    async start(interaction: Repliables, core?: Core): Promise<Message | undefined> {
        const response = await this.page(contextOf(interaction, core), 0);
        return new ReplySender(interaction).send(response, this.config.ephemeral ?? false);
    }

    /** Render a page as a {@link ReplyResponse}. To post it elsewhere, add `flags: MessageFlags.IsComponentsV2`. */
    async page(ctx: PageContext, n: number): Promise<ReplyResponse> {
        const view = await this.config.source.page(ctx, n);
        return renderPage(view, this.cursor, this.config);
    }
}
