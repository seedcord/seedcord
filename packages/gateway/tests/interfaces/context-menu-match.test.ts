import { DispatchContext } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it } from 'vite-plus/test';

import { MessageContextMenuHandler, UserContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { built } from '#tests/utils/built';

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

function userMenu(name: string): [UserContextMenuCommandInteraction<undefined>, Core, DispatchContext] {
    const event = {
        targetUser: { id: 'u1' } as unknown as User,
        targetMember: { id: 'm1' } as unknown as GuildMember
    } as unknown as UserContextMenuCommandInteraction<undefined>;
    return [event, core, new DispatchContext('userContextMenu', name)];
}

function messageMenu(name: string): [MessageContextMenuCommandInteraction<undefined>, Core, DispatchContext] {
    const event = {
        targetMessage: { id: 'msg1' } as unknown as Message
    } as unknown as MessageContextMenuCommandInteraction<undefined>;
    return [event, core, new DispatchContext('messageContextMenu', name)];
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
        const cases = {
            'View Profile': (): string => 'profile',
            'Say Hello': (): string => 'hello'
        };
        Reflect.deleteProperty(cases, 'Say Hello');
        return this.match(cases);
    }

    public async runMixed(): Promise<void> {
        const result = await this.match({ 'View Profile': () => 'profile', 'Say Hello': () => 1 });
        expectTypeOf(result).toEqualTypeOf<string | number>();
    }

    public readName(): 'View Profile' | 'Say Hello' {
        return this.route;
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

    public async runMixed(): Promise<void> {
        const result = await this.match({ 'Report Message': () => 'reported', 'Pin Message': () => 1 });
        expectTypeOf(result).toEqualTypeOf<string | number>();
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

class MissingCase extends UserContextMenuHandler<'View Profile' | 'Say Hello'> {
    public async execute(): Promise<void> {
        // @ts-expect-error every name in the generic needs a case.
        await this.match({
            'View Profile': () => undefined
        });
    }
}
void MissingCase;

class UnknownCase extends UserContextMenuHandler<'View Profile'> {
    public async execute(): Promise<void> {
        await this.match({
            'View Profile': () => undefined,
            // @ts-expect-error 'Say Hello' is not one of this handler's registered names.
            'Say Hello': () => undefined
        });
    }
}
void UnknownCase;

describe('context menu match', () => {
    it('runs the case for the selected command', async () => {
        await expect(built(Menu, ...userMenu('View Profile')).run()).resolves.toBe('profile');
        await expect(built(Menu, ...userMenu('Say Hello')).run()).resolves.toBe('hello');
    });

    it('hands a message case the clicked message', async () => {
        await expect(built(Tools, ...messageMenu('Pin Message')).run()).resolves.toBe('pinned msg1');
    });

    it('throws when the selected command lacks a case', async () => {
        let caught: unknown;
        try {
            await built(Menu, ...userMenu('Say Hello')).runPartial();
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)).toBe(true);
    });

    it('throws for a command named after an Object.prototype member', async () => {
        let caught: unknown;
        try {
            await built(Menu, ...userMenu('constructor')).run();
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)).toBe(true);
    });

    it('reads the selected command name without a case', () => {
        expect(built(Menu, ...userMenu('Say Hello')).readName()).toBe('Say Hello');
    });
});
