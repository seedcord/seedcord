import { ContextMenuKindBrand, ContextMenuNamesBrand } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { NamesFor } from '@seedcord/core/internal';
import type {
    APIInteractionDataResolvedGuildMember,
    APIMessage,
    APIMessageApplicationCommandInteraction,
    APIUser,
    APIUserApplicationCommandInteraction,
    ApplicationCommandType
} from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

type UserMenuArms<Names extends NamesFor<ApplicationCommandType.User>, Ret> = Record<
    Names,
    (target: APIUser, member: APIInteractionDataResolvedGuildMember | null) => Promisable<Ret>
>;

type MessageMenuArms<Names extends NamesFor<ApplicationCommandType.Message>, Ret> = Record<
    Names,
    (target: APIMessage) => Promisable<Ret>
>;

function armFor<Ret>(arms: object, name: string): (...args: never[]) => Promisable<Ret> {
    // hasOwn, since a plain lookup for a command named `constructor` returns Object.prototype's
    const arm = Object.hasOwn(arms, name) ? (arms as Record<string, unknown>)[name] : undefined;
    if (typeof arm !== 'function') throw new SeedcordError(SeedcordErrorCode.ContextMenuMatchArmMissing, [name]);
    return arm as (...args: never[]) => Promisable<Ret>;
}

/**
 * Base class for a user context-menu command handler on the HTTP transport (right-click a user).
 *
 * Pass the command name(s) as the generic, the same as `@UserContextMenuRoute`. Read the right-clicked user
 * from `this.target` and that same user's guild member from `this.targetMember`.
 *
 * @typeParam Names - One or more command names from the generated user registry.
 */
export abstract class UserContextMenuHandler<
    Names extends NamesFor<ApplicationCommandType.User>
> extends InteractionHandler<APIUserApplicationCommandInteraction> {
    // phantom, nothing reads them. they keep the kind and the names on the instance type
    /** @internal */
    declare readonly [ContextMenuKindBrand]?: ApplicationCommandType.User;
    /** @internal */
    declare readonly [ContextMenuNamesBrand]?: Names;

    protected get target(): APIUser {
        const { target_id: targetId, resolved } = this.event.data;
        // justified: discord resolves the target it delivered target_id for
        return resolved.users[targetId] as APIUser;
    }

    /** The right-clicked user's guild member, null outside a guild. */
    protected get targetMember(): APIInteractionDataResolvedGuildMember | null {
        const { target_id: targetId, resolved } = this.event.data;
        return resolved.members?.[targetId] ?? null;
    }

    /** Which of the registered commands fired. */
    protected get commandName(): Names {
        return this.event.data.name as Names;
    }

    /**
     * Run the arm for whichever command fired. Use this only when the handler is registered for several
     * names.
     *
     * Provide one arm per registered name, keyed by the name Discord shows in the right-click menu. Each
     * arm receives the clicked user and that user's guild member. The arms must cover every name in the
     * generic. A missing name or an unknown key is a compile error.
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
     *             'View Profile': (user) => this.reply(`Profile for ${user.username}.`),
     *             Warn: (user, member) => this.reply(`Warned ${member?.nick ?? user.username}.`)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(arms: UserMenuArms<Names, Ret>): Promise<Ret> {
        const arm = armFor<Ret>(arms, this.event.data.name);
        return await (
            arm as (target: APIUser, member: APIInteractionDataResolvedGuildMember | null) => Promisable<Ret>
        )(this.target, this.targetMember);
    }
}

/**
 * Base class for a message context-menu command handler on the HTTP transport (right-click a message).
 *
 * Pass the command name(s) as the generic, the same as `@MessageContextMenuRoute`. Read the right-clicked
 * message from `this.target`.
 *
 * @typeParam Names - One or more command names from the generated message registry.
 */
export abstract class MessageContextMenuHandler<
    Names extends NamesFor<ApplicationCommandType.Message>
> extends InteractionHandler<APIMessageApplicationCommandInteraction> {
    /** @internal */
    declare readonly [ContextMenuKindBrand]?: ApplicationCommandType.Message;
    /** @internal */
    declare readonly [ContextMenuNamesBrand]?: Names;

    protected get target(): APIMessage {
        const { target_id: targetId, resolved } = this.event.data;
        // justified: discord resolves the target it delivered target_id for
        return resolved.messages[targetId] as APIMessage;
    }

    /** Which of the registered commands fired. */
    protected get commandName(): Names {
        return this.event.data.name as Names;
    }

    /**
     * Run the arm for whichever command fired. Use this only when the handler is registered for several
     * names.
     *
     * Provide one arm per registered name, keyed by the name Discord shows in the right-click menu. Each
     * arm receives the clicked message. The arms must cover every name in the generic. A missing name or
     * an unknown key is a compile error.
     *
     * @param arms - One handler per registered command name.
     * @returns The result of the arm that ran.
     *
     * @example
     * ```ts
     * \@MessageContextMenuRoute('Report Message', 'Quote Message')
     * class MessageTools extends MessageContextMenuHandler<'Report Message' | 'Quote Message'> {
     *     async execute() {
     *         await this.match({
     *             'Report Message': (message) => this.report(message),
     *             'Quote Message': (message) => this.reply(`> ${message.content}`)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(arms: MessageMenuArms<Names, Ret>): Promise<Ret> {
        const arm = armFor<Ret>(arms, this.event.data.name);
        return await (arm as (target: APIMessage) => Promisable<Ret>)(this.target);
    }
}
