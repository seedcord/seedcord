import { ContextMenuKindBrand, ContextMenuNamesBrand } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { MenuCacheFor, NamesFor } from '@seedcord/core/internal';
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
import type { Promisable } from 'type-fest';

type UserMenuArms<Names extends NamesFor<ApplicationCommandType.User>, Ret> = {
    [Name in Names]: (
        target: User,
        member: CacheTypeReducer<
            MenuCacheFor<ApplicationCommandType.User, Name>,
            GuildMember,
            APIInteractionGuildMember
        > | null
    ) => Promisable<Ret>;
};

type MessageMenuArms<Names extends NamesFor<ApplicationCommandType.Message>, Ret> = {
    [Name in Names]: (
        target: Message<BooleanCache<MenuCacheFor<ApplicationCommandType.Message, Name>>>
    ) => Promisable<Ret>;
};

function armFor<Ret>(arms: object, name: string): (...args: never[]) => Promisable<Ret> {
    // hasOwn, since a plain lookup for a command named `constructor` returns Object.prototype's
    const arm = Object.hasOwn(arms, name) ? (arms as Record<string, unknown>)[name] : undefined;
    if (typeof arm !== 'function') throw new SeedcordTypeError(SeedcordErrorCode.ContextMenuMatchArmMissing, [name]);
    return arm as (...args: never[]) => Promisable<Ret>;
}

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

    /** Which of the registered commands fired. */
    protected get commandName(): Names {
        return this.event.commandName as Names;
    }

    /**
     * Run the arm for whichever command fired. Use this only when the handler is registered for several
     * names.
     *
     * Provide one arm per registered name, keyed by the name Discord shows in the right-click menu. Each
     * arm receives the clicked user and that user's guild member, both narrowed to the cache state of that
     * one command. The arms must cover every name in the generic. A missing name or an unknown key is a
     * compile error.
     *
     * @param arms - One handler per registered command name.
     * @returns The result of the arm that ran.
     *
     * @example
     * ```ts
     * \@UserContextMenuRoute('View Profile', 'Warn')
     * class Moderation extends UserContextMenuHandler<'View Profile' | 'Warn'> {
     *     async execute() {
     *         await this.match({
     *             'View Profile': (user) => this.reply(`Profile for ${user.tag}.`),
     *             Warn: (user, member) => this.reply(`Warned ${member?.displayName ?? user.tag}.`)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(arms: UserMenuArms<Names, Ret>): Promise<Ret> {
        const arm = armFor<Ret>(arms, this.event.commandName);
        return await (arm as (target: User, member: unknown) => Promisable<Ret>)(this.target, this.targetMember);
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

    /** Which of the registered commands fired. */
    protected get commandName(): Names {
        return this.event.commandName as Names;
    }

    /**
     * Run the arm for whichever command fired. Use this only when the handler is registered for several
     * names.
     *
     * Provide one arm per registered name, keyed by the name Discord shows in the right-click menu. Each
     * arm receives the clicked message, narrowed to the cache state of that one command. The arms must
     * cover every name in the generic. A missing name or an unknown key is a compile error.
     *
     * @param arms - One handler per registered command name.
     * @returns The result of the arm that ran.
     *
     * @example
     * ```ts
     * \@MessageContextMenuRoute('Report Message', 'Pin Message')
     * class MessageTools extends MessageContextMenuHandler<'Report Message' | 'Pin Message'> {
     *     async execute() {
     *         await this.match({
     *             'Report Message': (message) => this.report(message),
     *             'Pin Message': (message) => message.pin()
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(arms: MessageMenuArms<Names, Ret>): Promise<Ret> {
        const arm = armFor<Ret>(arms, this.event.commandName);
        return await (arm as (target: Message<BooleanCache<Cache>>) => Promisable<Ret>)(this.target);
    }
}
