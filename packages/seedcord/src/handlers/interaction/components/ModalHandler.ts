import { ComponentHandler } from './ComponentHandler';

import type { AnyCustomId } from '@customId/CustomId';
import type { CacheType, ModalSubmitInteraction } from 'discord.js';

/**
 * Base class for a modal submit handler.
 *
 * Register the customId definitions this handler decodes with `@ModalRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Read the submitted
 * inputs from `this.event.fields`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ConfigId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@ModalRoute(ConfigId)
 * class ConfigModal extends ModalHandler<[typeof ConfigId]> {
 *     \@Catchable()
 *     async execute() {
 *         const { guildId } = this.params;
 *         const name = this.event.fields.getTextInputValue('name');
 *         await this.event.reply(`saved ${name} for ${guildId}`);
 *     }
 * }
 * ```
 */
export abstract class ModalHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<ModalSubmitInteraction<Cache>, Defs> {}
