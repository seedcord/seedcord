import { ComponentKindBrand } from '@seedcord/core/internal';

import { ComponentHandler } from './ComponentHandler';

import type { SelectMenuKind } from '@seedcord/core';
import type { AnyCustomId } from '@seedcord/core/internal';
import type {
    CacheType,
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction
} from 'discord.js';

type SelectKey = 'values' | 'users' | 'members' | 'roles' | 'channels';

type EventMember<Kind extends SelectMenuKind, Cache extends CacheType, Key extends SelectKey> =
    Key extends keyof SelectMenuInteractionFor<Kind, Cache> ? SelectMenuInteractionFor<Kind, Cache>[Key] : never;

type SelectMenuInteractionFor<
    SelectMenu extends SelectMenuKind,
    Cache extends CacheType = CacheType
> = SelectMenu extends SelectMenuKind.String
    ? StringSelectMenuInteraction<Cache>
    : SelectMenu extends SelectMenuKind.User
      ? UserSelectMenuInteraction<Cache>
      : SelectMenu extends SelectMenuKind.Role
        ? RoleSelectMenuInteraction<Cache>
        : SelectMenu extends SelectMenuKind.Channel
          ? ChannelSelectMenuInteraction<Cache>
          : SelectMenu extends SelectMenuKind.Mentionable
            ? MentionableSelectMenuInteraction<Cache>
            : never;

/**
 * Base class for a select menu handler.
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
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
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
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<SelectMenuInteractionFor<Kind, Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: Kind;

    // Out is never on a kind whose interaction carries no such member
    private eventMember<Out>(key: SelectKey): Out {
        return (this.event as Partial<Record<SelectKey, unknown>>)[key] as Out;
    }

    /** The ids this select picked. */
    protected get values(): string[] {
        return this.eventMember('values');
    }

    /** The users this select picked. */
    protected get users(): EventMember<Kind, Cache, 'users'> {
        return this.eventMember('users');
    }

    /** The guild members behind the picked users. Discord resolves these only inside a guild. */
    protected get members(): EventMember<Kind, Cache, 'members'> {
        return this.eventMember('members');
    }

    /** The roles this select picked. */
    protected get roles(): EventMember<Kind, Cache, 'roles'> {
        return this.eventMember('roles');
    }

    /** The channels this select picked. */
    protected get channels(): EventMember<Kind, Cache, 'channels'> {
        return this.eventMember('channels');
    }
}
