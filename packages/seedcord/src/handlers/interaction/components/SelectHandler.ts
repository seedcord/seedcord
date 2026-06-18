import { ComponentHandler } from './ComponentHandler';

import type { SelectMenuInteractionFor, SelectMenuKind } from '@bDecorators/Interactions';
import type { AnyCustomId } from '@seedcord/kit/internal';
import type { CacheType } from 'discord.js';

/**
 * Base class for a select menu handler.
 *
 * Pass the select kind first and the customId definitions second, the same order as `@SelectMenuRoute`,
 * so `this.event` and `this.event.values` are narrowed to that kind. Read `this.params` for a single
 * route or `this.match` for several.
 *
 * @typeParam Kind - The select kind from {@link SelectMenuKind}, e.g. `SelectMenuType.User`.
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@SelectMenuRoute(SelectMenuType.User, AssignId)
 * class AssignSelect extends SelectHandler<SelectMenuType.User, [typeof AssignId]> {
 *     async execute() {
 *         const { roleId } = this.params;
 *         await this.event.reply(`assigning ${this.event.values.length} member(s) to <@&${roleId}>`);
 *     }
 * }
 * ```
 */
export abstract class SelectHandler<
    Kind extends SelectMenuKind,
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<SelectMenuInteractionFor<Kind, Cache>, Defs> {}
