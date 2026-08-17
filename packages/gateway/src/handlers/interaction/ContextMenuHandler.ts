import { ContextMenuKindBrand } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { ContextMenuKind } from '@seedcord/core';
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

type InteractionFor<Kind extends ContextMenuKind, Cache extends CacheType> = Kind extends ApplicationCommandType.User
    ? UserContextMenuCommandInteraction<Cache>
    : MessageContextMenuCommandInteraction<Cache>;

type TargetFor<Kind extends ContextMenuKind, Cache extends CacheType> = Kind extends ApplicationCommandType.User
    ? User
    : Message<BooleanCache<Cache>>;

type TargetMemberFor<Kind extends ContextMenuKind, Cache extends CacheType> = Kind extends ApplicationCommandType.User
    ? CacheTypeReducer<Cache, GuildMember, APIInteractionGuildMember> | null
    : never;

/**
 * Base class for a context-menu command handler (right-click a user or a message).
 *
 * Pass the kind from `discord.js`'s {@link ApplicationCommandType} as the generic, the same value as
 * `@ContextMenuRoute`. Read the right-clicked entity from `this.target`, a `User` for a user menu and a
 * `Message` for a message menu. Context menus carry no options, so a handler registered for several names
 * reads `this.target` uniformly with no per-name branch.
 *
 * @typeParam Kind - `ApplicationCommandType.User` or `ApplicationCommandType.Message`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 *
 * @example
 * ```ts
 * \@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')
 * class ReportMessage extends ContextMenuHandler<ApplicationCommandType.Message> {
 *     async execute() {
 *         const message = this.target;
 *     }
 * }
 * ```
 */
export abstract class ContextMenuHandler<
    Kind extends ContextMenuKind,
    Cache extends CacheType = 'cached'
> extends InteractionHandler<InteractionFor<Kind, Cache>> {
    // phantom, nothing reads it. it keeps Kind on the instance type
    /** @internal */
    declare readonly [ContextMenuKindBrand]?: Kind;

    protected get target(): TargetFor<Kind, Cache> {
        // justified: the Kind generic decides which interaction member is live, both narrow to TargetFor.
        const event = this.event;
        const target = 'targetUser' in event ? event.targetUser : event.targetMessage;
        return target as TargetFor<Kind, Cache>;
    }

    /**
     * The invoking guild member, resolved only on user menus. Reading it on a message menu is a compile
     * error since the type is `never` there.
     */
    protected get targetMember(): TargetMemberFor<Kind, Cache> {
        // justified: only the User-kind event carries targetMember, the Message-kind read is unreachable per the type.
        return (this.event as UserContextMenuCommandInteraction<Cache>).targetMember as TargetMemberFor<Kind, Cache>;
    }
}
