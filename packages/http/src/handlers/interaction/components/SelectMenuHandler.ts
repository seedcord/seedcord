import { ComponentKindBrand } from '@seedcord/core/internal';

import { ComponentHandler } from './ComponentHandler';

import type { SelectMenuKind } from '@seedcord/core';
import type { AnyCustomId } from '@seedcord/core/internal';
import type {
    APIMessageChannelSelectInteractionData,
    APIMessageComponentSelectMenuInteraction,
    APIMessageMentionableSelectInteractionData,
    APIMessageRoleSelectInteractionData,
    APIMessageStringSelectInteractionData,
    APIMessageUserSelectInteractionData
} from 'discord-api-types/v10';

type SelectMenuInteractionFor<Kind extends SelectMenuKind> = APIMessageComponentSelectMenuInteraction & {
    data: Kind extends SelectMenuKind.String
        ? APIMessageStringSelectInteractionData
        : Kind extends SelectMenuKind.User
          ? APIMessageUserSelectInteractionData
          : Kind extends SelectMenuKind.Role
            ? APIMessageRoleSelectInteractionData
            : Kind extends SelectMenuKind.Channel
              ? APIMessageChannelSelectInteractionData
              : Kind extends SelectMenuKind.Mentionable
                ? APIMessageMentionableSelectInteractionData
                : never;
};

/**
 * Base class for a select menu handler on the HTTP transport.
 *
 * Pass the select kind first and the customId definitions second, the same order as `@SelectMenuRoute`,
 * so `this.event.data` and its `values`/`resolved` are narrowed to that kind. Read `this.params` for a
 * single route or `this.match` for several, and reply through the handler members or rewrite the source
 * message with `this.update`.
 *
 * @typeParam Kind - The select kind from {@link SelectMenuKind}, e.g. `SelectMenuKind.User`.
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 */
export abstract class SelectMenuHandler<
    Kind extends SelectMenuKind,
    Defs extends readonly AnyCustomId[]
> extends ComponentHandler<SelectMenuInteractionFor<Kind>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: Kind;
}
