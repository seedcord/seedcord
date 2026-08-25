import { ContextMenuKindBrand, ContextMenuNamesBrand } from '@seedcord/core/internal';

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
}
