import { ComponentHandler } from './ComponentHandler';

import type { AnyCustomId } from '@seedcord/core/internal';
import type { APIMessageComponentButtonInteraction } from 'discord-api-types/v10';

/**
 * Base class for a button interaction handler on the HTTP transport.
 *
 * Register the customId definitions this handler decodes with `@ButtonRoute` and list the same ones in the
 * generic. Reply through the handler members, or rewrite the source message with `this.update`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ApproveId]`.
 */
export abstract class ButtonHandler<
    Defs extends readonly AnyCustomId[]
> extends ComponentHandler<APIMessageComponentButtonInteraction> {
    // anchors the Defs generic until customId decode reads it (this.params / this.match)
    declare protected readonly __defs?: Defs;
}
