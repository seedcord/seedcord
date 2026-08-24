import { ContextMenuKindBrand, ContextMenuNamesBrand } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { MenuCacheFor, NamesFor } from '@seedcord/core';
import type {
    APIInteractionGuildMember,
    ApplicationCommandType,
    BooleanCache,
    CacheType,
    CacheTypeReducer,
    GuildMember,
    Message,
    MessageContextMenuCommandInteraction,
    User,
    UserContextMenuCommandInteraction
} from 'discord.js';

/**
 * Base class for a user context-menu command handler (right-click a user).
 *
 * Pass the command name(s) as the generic, the same as `@UserContextMenuRoute`. Read the right-clicked
 * user from `this.target` and that same user's guild member from `this.targetMember`.
 *
 * @typeParam Names - One or more command names from the generated user registry.
 * @typeParam Cache - The interaction cache state. The command's contexts set it.
 *
 * @example
 * ```ts
 * \@UserContextMenuRoute('View Profile')
 * class ViewProfile extends UserContextMenuHandler<'View Profile'> {
 *     async execute() {
 *         const user = this.target;
 *     }
 * }
 * ```
 */
export abstract class UserContextMenuHandler<
    Names extends NamesFor<ApplicationCommandType.User>,
    Cache extends CacheType = MenuCacheFor<ApplicationCommandType.User, Names>
> extends InteractionHandler<UserContextMenuCommandInteraction<Cache>> {
    // phantom, nothing reads them. they keep the kind and the names on the instance type
    /** @internal */
    declare readonly [ContextMenuKindBrand]?: ApplicationCommandType.User;
    /** @internal */
    declare readonly [ContextMenuNamesBrand]?: Names;

    protected get target(): User {
        return this.event.targetUser;
    }

    /** The right-clicked user's guild member, null outside a guild. */
    protected get targetMember(): CacheTypeReducer<Cache, GuildMember, APIInteractionGuildMember> | null {
        return this.event.targetMember;
    }
}

/**
 * Base class for a message context-menu command handler (right-click a message).
 *
 * Pass the command name(s) as the generic, the same as `@MessageContextMenuRoute`. Read the right-clicked
 * message from `this.target`.
 *
 * @typeParam Names - One or more command names from the generated message registry.
 * @typeParam Cache - The interaction cache state. The command's contexts set it.
 *
 * @example
 * ```ts
 * \@MessageContextMenuRoute('Report Message')
 * class ReportMessage extends MessageContextMenuHandler<'Report Message'> {
 *     async execute() {
 *         const message = this.target;
 *     }
 * }
 * ```
 */
export abstract class MessageContextMenuHandler<
    Names extends NamesFor<ApplicationCommandType.Message>,
    Cache extends CacheType = MenuCacheFor<ApplicationCommandType.Message, Names>
> extends InteractionHandler<MessageContextMenuCommandInteraction<Cache>> {
    /** @internal */
    declare readonly [ContextMenuKindBrand]?: ApplicationCommandType.Message;
    /** @internal */
    declare readonly [ContextMenuNamesBrand]?: Names;

    protected get target(): Message<BooleanCache<Cache>> {
        return this.event.targetMessage;
    }
}
