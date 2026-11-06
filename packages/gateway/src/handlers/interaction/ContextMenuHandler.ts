import { ContextMenuKindBrand, ContextMenuNamesBrand, runCase } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { CaseReturn, MatchResult, MenuCacheFor, NamesFor, OnlyCases } from '@seedcord/core/internal';
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

type UserMenuCases<Names extends NamesFor<ApplicationCommandType.User>, Ret> = {
    [Name in Names]: (
        target: User,
        member: CacheTypeReducer<
            MenuCacheFor<ApplicationCommandType.User, Name>,
            GuildMember,
            APIInteractionGuildMember
        > | null
    ) => CaseReturn<Ret>;
};

type MessageMenuCases<Names extends NamesFor<ApplicationCommandType.Message>, Ret> = {
    [Name in Names]: (
        target: Message<BooleanCache<MenuCacheFor<ApplicationCommandType.Message, Name>>>
    ) => CaseReturn<Ret>;
};

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

    /** The selected context-menu command's name, without the interaction-kind prefix. */
    declare protected readonly route: Names;

    /**
     * Run the case for the selected command. Use this only when the handler is registered for several
     * names.
     *
     * Provide one case per registered name, keyed by the name Discord shows in the right-click menu. Each
     * case receives the clicked user and that user's guild member, both narrowed to the cache state of that
     * one command. The cases must cover every name in the generic. A missing name or an unknown key is a
     * compile error.
     *
     * @param cases - One handler per registered command name.
     * @typeParam Ret - The type that every case must return. Leave it out to get the union of what the cases return.
     * @returns The result of the case that ran.
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
    protected async match<Ret = never, Cases extends UserMenuCases<Names, Ret> = UserMenuCases<Names, Ret>>(
        cases: OnlyCases<Cases, UserMenuCases<Names, Ret>>
    ): Promise<MatchResult<Ret, Cases>> {
        return await runCase<MatchResult<Ret, Cases>>(
            this,
            cases,
            'context menu command',
            this.route,
            this.target,
            this.targetMember
        );
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

    /** The selected context-menu command's name, without the interaction-kind prefix. */
    declare protected readonly route: Names;

    /**
     * Run the case for the selected command. Use this only when the handler is registered for several
     * names.
     *
     * Provide one case per registered name, keyed by the name Discord shows in the right-click menu. Each
     * case receives the clicked message, narrowed to the cache state of that one command. The cases must
     * cover every name in the generic. A missing name or an unknown key is a compile error.
     *
     * @param cases - One handler per registered command name.
     * @typeParam Ret - The type that every case must return. Leave it out to get the union of what the cases return.
     * @returns The result of the case that ran.
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
    protected async match<Ret = never, Cases extends MessageMenuCases<Names, Ret> = MessageMenuCases<Names, Ret>>(
        cases: OnlyCases<Cases, MessageMenuCases<Names, Ret>>
    ): Promise<MatchResult<Ret, Cases>> {
        return await runCase<MatchResult<Ret, Cases>>(this, cases, 'context menu command', this.route, this.target);
    }
}
