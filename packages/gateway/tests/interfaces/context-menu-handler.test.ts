import { ContextMenuRoute } from '@seedcord/core';
import { ApplicationCommandType } from 'discord.js';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import type { Core } from '#interfaces/Core';
import type {
    GuildMember,
    Message,
    MessageContextMenuCommandInteraction,
    User,
    UserContextMenuCommandInteraction
} from 'discord.js';

// Compile-time spec for ContextMenuHandler and @ContextMenuRoute. The execute() bodies are typechecked but
// never run, so each guarded mistake fails the build if it stops being a compile error. The two registries
// stay separate because Discord allows a user command and a message command to share a name.
declare module '@seedcord/core' {
    interface UserContextMenuRegistry {
        'View Profile': true;
        Report: true;
    }
    interface MessageContextMenuRegistry {
        'Report Message': true;
        Report: true;
    }
}

const core = {} as unknown as Core;

// a fake user-menu interaction, the target getter reads only targetUser and targetMember.
function userMenu(target: User, member: GuildMember | null): UserContextMenuCommandInteraction<'cached'> {
    // justified: the target getter touches only targetUser and targetMember, a minimal fixture is enough.
    return { targetUser: target, targetMember: member } as unknown as UserContextMenuCommandInteraction<'cached'>;
}

// a fake message-menu interaction, the target getter reads only targetMessage (no targetUser key).
function messageMenu(target: Message): MessageContextMenuCommandInteraction<'cached'> {
    // justified: the target getter touches only targetMessage, a minimal fixture is enough.
    return { targetMessage: target } as unknown as MessageContextMenuCommandInteraction<'cached'>;
}

// a user-menu handler types this.target as User and reaches this.targetMember
class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        expectTypeOf(this.target).toEqualTypeOf<User>();
        expectTypeOf(this.targetMember).toEqualTypeOf<GuildMember | null>();
        await Promise.resolve();
    }
    readTarget(): User {
        return this.target;
    }
    readMember(): GuildMember | null {
        return this.targetMember;
    }
}

// a message-menu handler types this.target as Message, and this.targetMember is never (a compile error to read)
class ReportMessage extends ContextMenuHandler<ApplicationCommandType.Message> {
    async execute(): Promise<void> {
        expectTypeOf(this.target).toEqualTypeOf<Message<true>>();
        // @ts-expect-error a message menu has no invoking member, targetMember is never here.
        void this.targetMember.id;
        await Promise.resolve();
    }
    readTarget(): Message<true> {
        return this.target;
    }
}

// @ContextMenuRoute kind and name must match the handler generic, in both directions.
@ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
class DecoratedUser extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedUser;

@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')
class DecoratedMessage extends ContextMenuHandler<ApplicationCommandType.Message> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedMessage;

// a handler may serve several names of one kind, reading this.target uniformly
@ContextMenuRoute(ApplicationCommandType.User, 'View Profile', 'Report')
class MultiUser extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void MultiUser;

// the decorator kind is User but the handler generic is Message
// @ts-expect-error the handler declares Message, the decorator passes User.
@ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
class KindMismatchUserDecorator extends ContextMenuHandler<ApplicationCommandType.Message> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the decorator kind is Message but the handler generic is User
// @ts-expect-error the handler declares User, the decorator passes Message.
@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')
class KindMismatchMessageDecorator extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the name is not registered for the user kind
// @ts-expect-error 'Ghost' is not a key of UserContextMenuRegistry.
@ContextMenuRoute(ApplicationCommandType.User, 'Ghost')
class UnknownUserName extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// a message-only name is rejected on the user kind, the per-kind registries keep them apart
// @ts-expect-error 'Report Message' is a message name, not a key of UserContextMenuRegistry.
@ContextMenuRoute(ApplicationCommandType.User, 'Report Message')
class WrongKindName extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

describe('ContextMenuHandler', () => {
    it('reads the right target member per kind', () => {
        const user = { id: 'u1' } as unknown as User;
        const member = { id: 'm1' } as unknown as GuildMember;
        const handler = new ViewProfile(userMenu(user, member), core);
        expect(handler.readTarget()).toBe(user);
        expect(handler.readMember()).toBe(member);

        const message = { id: 'msg1' } as unknown as Message<true>;
        expect(new ReportMessage(messageMenu(message), core).readTarget()).toBe(message);
    });

    it('rejects kind and name mismatches', () => {
        expect([KindMismatchUserDecorator, KindMismatchMessageDecorator, UnknownUserName, WrongKindName]).toHaveLength(
            4
        );
    });
});
