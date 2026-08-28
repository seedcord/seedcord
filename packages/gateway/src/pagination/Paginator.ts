import { PaginatorBase } from '@seedcord/core';

import { ButtonHandler } from '#handlers/interaction/components';

import type { SentMessage } from '#bot/ReplySender';
import type { RepliableHandler } from '#handlers/RepliableHandler';
import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { PageContext } from './PageContext';
import type { PaginatorConfig } from '@seedcord/core';
import type { PageCursor } from '@seedcord/core/internal';
import type { ReplyResponse } from '@seedcord/types';
import type { ButtonInteraction, CacheType } from 'discord.js';

// `& { execute }` concretizes the abstract execute so the empty `extends Bans.Handler {}` stays concrete
// (no TS2515) and a concrete Nav assigns with no cast.
// a nav click arrives wherever the paginated message lives
type PaginatorHandlerCtor<Prefix extends string> = new (
    event: ButtonInteraction<CacheType>,
    core: Core
) => ButtonHandler<[PageCursor<Prefix>], CacheType> & { execute(): Promise<void> };

function contextOf(interaction: Repliables, core: Core): PageContext {
    return { interaction, user: interaction.user, guild: interaction.guild, core };
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
 *     source: new ArraySource((ctx) => ctx.guild?.bans.fetch().then((b) => [...b.values()]) ?? [], { perPage: 10 }),
 *     renderItem: (ban) => ban.user.tag
 * });
 *
 * \@ButtonRoute(Bans.cursor)
 * export class BansNav extends Bans.Handler {}
 * ```
 */
export class Paginator<Item, const Prefix extends string> extends PaginatorBase<Item, Prefix, PageContext> {
    /** The nav handler base. Extend it with an empty body and decorate it, `@ButtonRoute(p.cursor)`. */
    public readonly Handler: PaginatorHandlerCtor<Prefix>;

    constructor(config: PaginatorConfig<Item, Prefix, PageContext>) {
        super(config);

        // an arrow captures the paginator lexically so Nav.execute can reach it without aliasing `this`.
        const pageFor = (handler: RepliableHandler<Repliables>, n: number): Promise<ReplyResponse> =>
            this.page(handler, n);
        this.Handler = class Nav extends ButtonHandler<[PageCursor<Prefix>], CacheType> {
            async execute(): Promise<void> {
                await this.deferUpdate();
                const response = await pageFor(this, this.params.page);
                // deferUpdate seeds the sender deferred-update, so update PATCHes @original
                await this.update(response);
            }
        };
    }

    /**
     * Render a page as a {@link ReplyResponse} without sending anything.
     *
     * @param handler - The handler rendering the page, normally `this`.
     * @param n - The zero-based page.
     */
    async page(handler: RepliableHandler<Repliables>, n: number): Promise<ReplyResponse> {
        return this.buildPage(contextOf(handler.getEvent(), handler.core), n);
    }

    /**
     * Send a page through the handler's sender. The sender picks reply, edit, or followUp from its ack state.
     *
     * @param handler - The handler starting the paginator, normally `this`.
     * @param n - The zero-based page to open on.
     */
    async start(handler: RepliableHandler<Repliables>, n = 0): Promise<SentMessage> {
        const response = await this.page(handler, n);
        return handler.sender.send(response, { ephemeral: this.config.ephemeral ?? false });
    }
}
