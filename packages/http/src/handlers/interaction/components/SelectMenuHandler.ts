import { ComponentKindBrand } from '@seedcord/core/internal';

import { pick } from '#inputs/pick';

import { ComponentHandler } from './ComponentHandler';

import type { SelectMenuKind } from '@seedcord/core';
import type { AnyCustomId } from '@seedcord/core/internal';
import type {
    APIInteractionDataResolved,
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIMessageChannelSelectInteractionData,
    APIMessageComponentSelectMenuInteraction,
    APIMessageMentionableSelectInteractionData,
    APIMessageRoleSelectInteractionData,
    APIMessageStringSelectInteractionData,
    APIMessageUserSelectInteractionData,
    APIRole,
    APIUser
} from 'discord-api-types/v10';

type UserKinds = SelectMenuKind.User | SelectMenuKind.Mentionable;
type RoleKinds = SelectMenuKind.Role | SelectMenuKind.Mentionable;

// use tuple form so mixed kinds don't resolve to empty maps
type ResolvedFor<Kind extends SelectMenuKind, Allowed extends SelectMenuKind, Value> = [Kind] extends [Allowed]
    ? Map<string, Value>
    : never;

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
 * Pass the select kind first and the customId definitions second, the same order as `@SelectMenuRoute`.
 * Read the picked ids from `this.values`. The kind decides which of `this.users`, `this.members`,
 * `this.roles`, and `this.channels` this handler carries. The rest are `never`.
 *
 * Read `this.params` for a single route or `this.match` for several. Reply through the handler members, or
 * rewrite the source message with `this.update`.
 *
 * @typeParam Kind - The select kind from {@link SelectMenuKind}, e.g. `SelectMenuKind.User`.
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 *
 * @example
 * ```ts
 * \@SelectMenuRoute(SelectMenuKind.User, AssignId)
 * class AssignSelect extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
 *     async execute() {
 *         const { roleId } = this.params;
 *         await this.reply(`assigning ${this.users.size} member(s) to <@&${roleId}>`);
 *     }
 * }
 * ```
 */
export abstract class SelectMenuHandler<
    Kind extends SelectMenuKind,
    Defs extends readonly AnyCustomId[]
> extends ComponentHandler<SelectMenuInteractionFor<Kind>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: Kind;

    private get selection(): { values: string[]; resolved?: APIInteractionDataResolved } {
        return this.event.data;
    }

    // Out is never on a kind whose payload carries no such bucket
    private resolvedMap<Value, Out>(bucket: Record<string, Value> | undefined): Out {
        return pick(this.selection.values, bucket) as Out;
    }

    /** The ids this select picked. */
    protected get values(): string[] {
        return this.selection.values;
    }

    /** The users this select picked. */
    protected get users(): ResolvedFor<Kind, UserKinds, APIUser> {
        return this.resolvedMap(this.selection.resolved?.users);
    }

    /** The guild members behind the picked users. Discord resolves these only inside a guild. */
    protected get members(): ResolvedFor<Kind, UserKinds, APIInteractionDataResolvedGuildMember> {
        return this.resolvedMap(this.selection.resolved?.members);
    }

    /** The roles this select picked. */
    protected get roles(): ResolvedFor<Kind, RoleKinds, APIRole> {
        return this.resolvedMap(this.selection.resolved?.roles);
    }

    /** The channels this select picked. */
    protected get channels(): ResolvedFor<Kind, SelectMenuKind.Channel, APIInteractionDataResolvedChannel> {
        return this.resolvedMap(this.selection.resolved?.channels);
    }
}
