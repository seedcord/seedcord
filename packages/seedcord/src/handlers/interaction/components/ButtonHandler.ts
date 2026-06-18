import { ComponentHandler } from './ComponentHandler';

import type { AnyCustomId } from '@seedcord/kit/internal';
import type { ButtonInteraction, CacheType } from 'discord.js';

/**
 * Base class for a button interaction handler.
 *
 * Register the customId definitions this handler decodes with `@ButtonRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Passing different
 * definitions to the decorator and the generic is a compile error.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ApproveId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@ButtonRoute(ApproveId)
 * class ApproveButton extends ButtonHandler<[typeof ApproveId]> {
 *     async execute() {
 *         const { userId } = this.params;
 *         await this.event.reply(`approved <@${userId}>`);
 *     }
 * }
 * ```
 */
export abstract class ButtonHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<ButtonInteraction<Cache>, Defs> {}
