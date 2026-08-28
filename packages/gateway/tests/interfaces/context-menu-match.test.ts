import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { MessageContextMenuHandler, UserContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import type { Core } from '#interfaces/Core';
import type {
    APIInteractionGuildMember,
    GuildMember,
    Message,
    MessageContextMenuCommandInteraction,
    User,
    UserContextMenuCommandInteraction
} from 'discord.js';

declare module '@seedcord/core' {
    interface UserContextMenuRegistry {
        'View Profile': { cache: 'cached' };
        'Say Hello': { cache: undefined };
    }
    interface MessageContextMenuRegistry {
        'Report Message': { cache: 'cached' };
        'Pin Message': { cache: undefined };
    }
}

// justified: nothing on this path reads core
const core = {} as unknown as Core;

function userMenu(name: string): UserContextMenuCommandInteraction<undefined> {
    return {
        commandName: name,
        targetUser: { id: 'u1' } as unknown as User,
        targetMember: { id: 'm1' } as unknown as GuildMember
    } as unknown as UserContextMenuCommandInteraction<undefined>;
}

function messageMenu(name: string): MessageContextMenuCommandInteraction<undefined> {
    return {
        commandName: name,
        targetMessage: { id: 'msg1' } as unknown as Message
    } as unknown as MessageContextMenuCommandInteraction<undefined>;
}

class Menu extends UserContextMenuHandler<'View Profile' | 'Say Hello'> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }

    public run(): Promise<string> {
        return this.match({
            'View Profile': () => 'profile',
            'Say Hello': () => 'hello'
        });
    }

    public runPartial(): Promise<string> {
        const arms = {
            'View Profile': (): string => 'profile',
            'Say Hello': (): string => 'hello'
        };
        Reflect.deleteProperty(arms, 'Say Hello');
        return this.match(arms);
    }

    public readName(): 'View Profile' | 'Say Hello' {
        return this.commandName;
    }
}

class Tools extends MessageContextMenuHandler<'Report Message' | 'Pin Message'> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }

    public run(): Promise<string> {
        return this.match({
            'Report Message': (message) => `reported ${message.id}`,
            'Pin Message': (message) => `pinned ${message.id}`
        });
    }
}

class Narrowing extends UserContextMenuHandler<'View Profile' | 'Say Hello'> {
    public async execute(): Promise<void> {
        expectTypeOf(this.targetMember).toEqualTypeOf<GuildMember | APIInteractionGuildMember | null>();

        await this.match({
            'View Profile': (target, member) => {
                expectTypeOf(target).toEqualTypeOf<User>();
                expectTypeOf(member).toEqualTypeOf<GuildMember | null>();
            },
            'Say Hello': (_target, member) => {
                expectTypeOf(member).toEqualTypeOf<GuildMember | APIInteractionGuildMember | null>();
            }
        });
    }
}
void Narrowing;

class MissingArm extends UserContextMenuHandler<'View Profile' | 'Say Hello'> {
    public async execute(): Promise<void> {
        // @ts-expect-error every name in the generic needs an arm.
        await this.match({
            'View Profile': () => undefined
        });
    }
}
void MissingArm;

class UnknownArm extends UserContextMenuHandler<'View Profile'> {
    public async execute(): Promise<void> {
        await this.match({
            'View Profile': () => undefined,
            // @ts-expect-error 'Say Hello' is not one of this handler's registered names.
            'Say Hello': () => undefined
        });
    }
}
void UnknownArm;

describe('context menu match', () => {
    it('runs the arm for the command that fired', async () => {
        await expect(new Menu(userMenu('View Profile'), core).run()).resolves.toBe('profile');
        await expect(new Menu(userMenu('Say Hello'), core).run()).resolves.toBe('hello');
    });

    it('hands a message arm the clicked message', async () => {
        await expect(new Tools(messageMenu('Pin Message'), core).run()).resolves.toBe('pinned msg1');
    });

    it('throws when the fired command has no arm', async () => {
        let caught: unknown;
        try {
            await new Menu(userMenu('Say Hello'), core).runPartial();
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.ContextMenuMatchArmMissing)).toBe(true);
    });

    it('throws for a command named after an Object.prototype member', async () => {
        let caught: unknown;
        try {
            await new Menu(userMenu('constructor'), core).run();
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.ContextMenuMatchArmMissing)).toBe(true);
    });

    it('reads the fired command name without an arm', () => {
        expect(new Menu(userMenu('Say Hello'), core).readName()).toBe('Say Hello');
    });
});
