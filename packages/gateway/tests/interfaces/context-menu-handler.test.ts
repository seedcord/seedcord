import { UserContextMenuRoute, MessageContextMenuRoute } from '@seedcord/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { UserContextMenuHandler, MessageContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import type { Core } from '#interfaces/Core';
import type {
    GuildMember,
    Message,
    MessageContextMenuCommandInteraction,
    User,
    UserContextMenuCommandInteraction
} from 'discord.js';

// The execute() bodies are typechecked and never run. Discord allows a user command and a message command
// to share a name, which is what the two `Report` rows below stand in for.
declare module '@seedcord/core' {
    interface UserContextMenuRegistry {
        'View Profile': { cache: 'cached' };
        Report: { cache: 'cached' };
    }
    interface MessageContextMenuRegistry {
        'Report Message': { cache: 'cached' };
        Report: { cache: 'cached' };
    }
}

// justified: the target getters read the event only
const core = {} as unknown as Core;

function userMenu(target: User, member: GuildMember | null): UserContextMenuCommandInteraction<'cached'> {
    // justified: the target getter touches only targetUser and targetMember, a minimal fixture is enough.
    return { targetUser: target, targetMember: member } as unknown as UserContextMenuCommandInteraction<'cached'>;
}

function messageMenu(target: Message): MessageContextMenuCommandInteraction<'cached'> {
    // justified: the target getter touches only targetMessage, a minimal fixture is enough.
    return { targetMessage: target } as unknown as MessageContextMenuCommandInteraction<'cached'>;
}

class ViewProfile extends UserContextMenuHandler<'View Profile'> {
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

class ReportMessage extends MessageContextMenuHandler<'Report Message'> {
    async execute(): Promise<void> {
        expectTypeOf(this.target).toEqualTypeOf<Message<true>>();
        // @ts-expect-error a message menu has no invoking member.
        void this.targetMember;
        await Promise.resolve();
    }
    readTarget(): Message<true> {
        return this.target;
    }
}

@UserContextMenuRoute('View Profile')
class DecoratedUser extends UserContextMenuHandler<'View Profile'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedUser;

@MessageContextMenuRoute('Report Message')
class DecoratedMessage extends MessageContextMenuHandler<'Report Message'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedMessage;

@UserContextMenuRoute('View Profile', 'Report')
class MultiUser extends UserContextMenuHandler<'View Profile' | 'Report'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void MultiUser;

// @ts-expect-error 'Ghost' is not a key of UserContextMenuRegistry.
@UserContextMenuRoute('Ghost')
class UnknownUserName extends UserContextMenuHandler<'View Profile'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// @ts-expect-error 'Report Message' belongs to the message registry only.
@UserContextMenuRoute('Report Message')
class WrongKindName extends UserContextMenuHandler<'View Profile'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// @ts-expect-error the handler declares 'Report', the decorator passes 'View Profile'.
@UserContextMenuRoute('View Profile')
class NameMismatch extends UserContextMenuHandler<'Report'> {
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

    it('rejects an unregistered or wrong-kind name', () => {
        expect([UnknownUserName, WrongKindName, NameMismatch]).toHaveLength(3);
    });
});
