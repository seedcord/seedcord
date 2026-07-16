import { ApplicationCommandType } from 'discord-api-types/v10';

import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type {
    APIInteractionDataResolvedGuildMember,
    APIMessage,
    APIMessageApplicationCommandInteraction,
    APIUser,
    APIUserApplicationCommandInteraction
} from 'discord-api-types/v10';

type ContextMenuKind = ApplicationCommandType.User | ApplicationCommandType.Message;

type InteractionFor<Kind extends ContextMenuKind> = Kind extends ApplicationCommandType.User
    ? APIUserApplicationCommandInteraction
    : APIMessageApplicationCommandInteraction;

type TargetFor<Kind extends ContextMenuKind> = Kind extends ApplicationCommandType.User ? APIUser : APIMessage;

type TargetMemberFor<Kind extends ContextMenuKind> = Kind extends ApplicationCommandType.User
    ? APIInteractionDataResolvedGuildMember | null
    : never;

/**
 * Base class for a context-menu command handler on the HTTP transport (right-click a user or a message).
 *
 * Pass the kind from {@link ApplicationCommandType} as the generic. Read the right-clicked entity from
 * `this.target`, an `APIUser` for a user menu and an `APIMessage` for a message menu. Context menus carry
 * no options, so a handler registered for several names reads `this.target` uniformly with no per-name
 * branch.
 *
 * @typeParam Kind - `ApplicationCommandType.User` or `ApplicationCommandType.Message`.
 */
export abstract class ContextMenuHandler<Kind extends ContextMenuKind> extends InteractionHandler<
    InteractionFor<Kind>
> {
    protected get target(): TargetFor<Kind> {
        const data = this.event.data;
        const target =
            data.type === ApplicationCommandType.User
                ? data.resolved.users[data.target_id]
                : data.resolved.messages[data.target_id];
        // justified: Discord resolves the target it delivered target_id for, the Kind generic picks the arm.
        return target as TargetFor<Kind>;
    }

    /**
     * The right-clicked user's guild member, resolved only on user menus fired in a guild. Reading it on a
     * message menu is a compile error.
     */
    protected get targetMember(): TargetMemberFor<Kind> {
        const data = this.event.data;
        const member =
            data.type === ApplicationCommandType.User ? (data.resolved.members?.[data.target_id] ?? null) : null;
        // justified: only the User-kind event includes resolved members, the Message-kind read is unreachable per the type.
        return member as TargetMemberFor<Kind>;
    }
}
