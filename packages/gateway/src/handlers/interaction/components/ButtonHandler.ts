import { ComponentKindBrand } from '@seedcord/core/internal';

import { ComponentHandler } from './ComponentHandler';

import type { InteractionKind } from '@seedcord/core';
import type { AnyCustomId } from '@seedcord/custom-id';
import type { ButtonInteraction, CacheType } from 'discord.js';

/**
 * Base class for a button interaction handler.
 *
 * Register the customId definitions this handler decodes with `@ButtonRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Reply through the handler
 * members, or rewrite the source message with `this.update`. Passing different definitions to the decorator
 * and the generic is a compile error.
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
 *         await this.reply(`approved <@${userId}>`);
 *     }
 * }
 * ```
 */
export abstract class ButtonHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<ButtonInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.Button;
}
