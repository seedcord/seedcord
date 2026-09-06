import { ComponentKindBrand } from '@seedcord/core/internal';

import { ComponentHandler } from './ComponentHandler';

import type { InteractionKind } from '@seedcord/core';
import type { AnyCustomId } from '@seedcord/custom-id';
import type {
    AnySelectMenuInteraction,
    CacheType,
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction
} from 'discord.js';

/**
 * Shared base the select menu handlers extend.
 *
 * Not a public entry point. Extend {@link StringMenuHandler}, {@link UserMenuHandler},
 * {@link RoleMenuHandler}, {@link ChannelMenuHandler}, or {@link MentionableMenuHandler} instead. This
 * class defines the `values` getter those bases share.
 *
 * @typeParam Event - The select menu interaction type this handler processes
 * @typeParam Defs - The customId route definitions registered on the concrete handler
 */
export abstract class SelectMenuHandler<
    Event extends AnySelectMenuInteraction,
    Defs extends readonly AnyCustomId[]
> extends ComponentHandler<Event, Defs> {
    /** The values this select picked. On every kind but the string menu they are snowflake ids. */
    protected get values(): string[] {
        return this.event.values;
    }
}

/**
 * Base class for a string select menu handler.
 *
 * Register the customId definitions with `@StringMenuRoute`, list the same ones in the generic, then read
 * the chosen option values from `this.values`. Read `this.params` for a single route or `this.match` for
 * several. Reply through the handler members, or rewrite the source message with `this.update`.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof TopicsId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@StringMenuRoute(TopicsId)
 * class Topics extends StringMenuHandler<[typeof TopicsId]> {
 *     async execute() {
 *         const { userId } = this.params;
 *         await this.update(`<@${userId}> now follows ${this.values.join(', ')}`);
 *     }
 * }
 * ```
 */
export abstract class StringMenuHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends SelectMenuHandler<StringSelectMenuInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.StringMenu;
}

/**
 * Base class for a user select menu handler.
 *
 * Beside `this.values` this handler declares `this.users` and `this.members`. Register the customId
 * definitions with `@UserMenuRoute` and list the same ones in the generic.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof AssignId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@UserMenuRoute(AssignId)
 * class Assign extends UserMenuHandler<[typeof AssignId]> {
 *     async execute() {
 *         const { roleId } = this.params;
 *         await this.reply(`assigning ${this.users.size} member(s) to <@&${roleId}>`);
 *     }
 * }
 * ```
 */
export abstract class UserMenuHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends SelectMenuHandler<UserSelectMenuInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.UserMenu;

    /** The users this select picked. */
    protected get users(): UserSelectMenuInteraction<Cache>['users'] {
        return this.event.users;
    }

    /** The guild members behind the picked users. Discord resolves these only inside a guild. */
    protected get members(): UserSelectMenuInteraction<Cache>['members'] {
        return this.event.members;
    }
}

/**
 * Base class for a role select menu handler.
 *
 * Beside `this.values` this handler declares `this.roles`. Register the customId definitions with
 * `@RoleMenuRoute` and list the same ones in the generic.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof GrantId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@RoleMenuRoute(GrantId)
 * class Grant extends RoleMenuHandler<[typeof GrantId]> {
 *     async execute() {
 *         await this.update(`granting ${this.roles.size} role(s)`);
 *     }
 * }
 * ```
 */
export abstract class RoleMenuHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends SelectMenuHandler<RoleSelectMenuInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.RoleMenu;

    /** The roles this select picked. */
    protected get roles(): RoleSelectMenuInteraction<Cache>['roles'] {
        return this.event.roles;
    }
}

/**
 * Base class for a channel select menu handler.
 *
 * Beside `this.values` this handler declares `this.channels`. Register the customId definitions with
 * `@ChannelMenuRoute` and list the same ones in the generic.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof LogTargetId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@ChannelMenuRoute(LogTargetId)
 * class LogTarget extends ChannelMenuHandler<[typeof LogTargetId]> {
 *     async execute() {
 *         await this.update(`logging to ${this.channels.size} channel(s)`);
 *     }
 * }
 * ```
 */
export abstract class ChannelMenuHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends SelectMenuHandler<ChannelSelectMenuInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.ChannelMenu;

    /** The channels this select picked. */
    protected get channels(): ChannelSelectMenuInteraction<Cache>['channels'] {
        return this.event.channels;
    }
}

/**
 * Base class for a mentionable select menu handler.
 *
 * A mentionable menu accepts users and roles together. `this.users`, `this.members`, and `this.roles`
 * can each come back empty.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof InviteId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@MentionableMenuRoute(InviteId)
 * class Invite extends MentionableMenuHandler<[typeof InviteId]> {
 *     async execute() {
 *         await this.update(`inviting ${this.users.size} user(s) and ${this.roles.size} role(s)`);
 *     }
 * }
 * ```
 */
export abstract class MentionableMenuHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends SelectMenuHandler<MentionableSelectMenuInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.MentionableMenu;

    /** The users this select picked. */
    protected get users(): MentionableSelectMenuInteraction<Cache>['users'] {
        return this.event.users;
    }

    /** The guild members behind the picked users. Discord resolves these only inside a guild. */
    protected get members(): MentionableSelectMenuInteraction<Cache>['members'] {
        return this.event.members;
    }

    /** The roles this select picked. */
    protected get roles(): MentionableSelectMenuInteraction<Cache>['roles'] {
        return this.event.roles;
    }
}
