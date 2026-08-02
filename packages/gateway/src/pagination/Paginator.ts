import { PaginatorBase } from '@seedcord/core';

import { ButtonHandler } from '@handlers/interaction/components';

import type { PageContext } from './PageContext';
import type { RepliableHandler } from '@handlers/RepliableHandler';
import type { Core } from '@interfaces/Core';
import type { PaginatorConfig } from '@seedcord/core';
import type { PageCursor } from '@seedcord/core/internal';
import type { ReplyResponse } from '@seedcord/types';
import type { Repliables } from '@src/handlers/interactionTypes';
import type { ButtonInteraction, Message } from 'discord.js';

// `& { execute }` concretizes the abstract execute so the empty `extends Bans.Handler {}` stays concrete
// (no TS2515) and a concrete Nav assigns with no cast.
type PaginatorHandlerCtor<Prefix extends string> = new (
    event: ButtonInteraction<'cached'>,
    core: Core
) => ButtonHandler<[PageCursor<Prefix>]> & { execute(): Promise<void> };

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
 *     source: new ArraySource((ctx) => ctx.guild.bans.fetch().then((b) => [...b.values()]), { perPage: 10 }),
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
        const loadPage = (ctx: PageContext, n: number): Promise<ReplyResponse> => this.page(ctx, n);
        this.Handler = class Nav extends ButtonHandler<[PageCursor<Prefix>]> {
            async execute(): Promise<void> {
                await this.deferUpdate();
                const response = await loadPage(contextOf(this.event, this.core), this.params.page);
                // deferUpdate seeds the sender deferred-update, so update PATCHes @original
                await this.update(response);
            }
        };
    }

    /**
     * Render page 0 and send it through the handler's sender, which picks reply, edit, or followUp from its
     * ack state.
     *
     * @param handler - The handler starting the paginator, normally `this`.
     */
    async start(handler: RepliableHandler<Repliables>): Promise<Message> {
        const interaction = handler.getEvent();
        const response = await this.page(contextOf(interaction, handler.core), 0);
        return handler.getSender().send(response, { ephemeral: this.config.ephemeral ?? false });
    }
}
