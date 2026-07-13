import { ComponentHandler } from './ComponentHandler';

import type { AnyCustomId } from '@seedcord/core/internal';
import type { APIMessageComponentSelectMenuInteraction } from 'discord-api-types/v10';

/**
 * Base class for a select menu handler on the HTTP transport.
 *
 * Register the customId definitions this handler decodes with `@SelectMenuRoute` and list the same ones in
 * the generic. Reply through the handler members, or rewrite the source message with `this.update`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 */
export abstract class SelectMenuHandler<
    Defs extends readonly AnyCustomId[]
> extends ComponentHandler<APIMessageComponentSelectMenuInteraction> {
    // anchors the Defs generic until customId decode reads it (this.params / this.match)
    declare protected readonly __defs?: Defs;
}
