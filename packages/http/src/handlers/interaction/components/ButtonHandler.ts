import { ComponentKindBrand } from '@seedcord/core/internal';

import { ComponentHandler } from './ComponentHandler';

import type { AnyCustomId } from '@seedcord/core/internal';
import type { APIMessageComponentButtonInteraction } from 'discord-api-types/v10';

/**
 * Base class for a button interaction handler on the HTTP transport.
 *
 * Register the customId definitions this handler decodes with `@ButtonRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Reply through the
 * handler members, or rewrite the source message with `this.update`. Passing different definitions to the
 * decorator and the generic is a compile error.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ApproveId]`.
 */
export abstract class ButtonHandler<Defs extends readonly AnyCustomId[]> extends ComponentHandler<
    APIMessageComponentButtonInteraction,
    Defs
> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: 'button';
}
