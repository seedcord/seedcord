import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { MessageContextMenuHandler, UserContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import type { Core } from '#interfaces/Core';
import type {
    APIInteractionDataResolvedGuildMember,
    APIMessage,
    APIMessageApplicationCommandInteraction,
    APIUser,
    APIUserApplicationCommandInteraction
} from 'discord-api-types/v10';

declare module '@seedcord/core' {
    interface UserContextMenuRegistry {
        'hb Profile': { cache: 'cached' };
        'hb Greet': { cache: undefined };
    }
    interface MessageContextMenuRegistry {
        'hb Report': { cache: 'cached' };
        'hb Pin': { cache: undefined };
    }
}

// justified: nothing on this path reads core
const core = {} as unknown as Core;

const user: APIUser = { id: 'u1', username: 'dhruv', discriminator: '0', global_name: null, avatar: null };

function userMenuEvent(name: string): APIUserApplicationCommandInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 2,
        data: {
            id: 'c1',
            type: ApplicationCommandType.User,
            name,
            target_id: 'u1',
            resolved: { users: { u1: user }, members: { u1: { nick: 'dee' } } }
        }
    } as unknown as APIUserApplicationCommandInteraction;
}

function messageMenuEvent(name: string): APIMessageApplicationCommandInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 2,
        data: {
            id: 'c1',
            type: ApplicationCommandType.Message,
            name,
            target_id: 'msg1',
            resolved: { messages: { msg1: { id: 'msg1' } } }
        }
    } as unknown as APIMessageApplicationCommandInteraction;
}

class Menu extends UserContextMenuHandler<'hb Profile' | 'hb Greet'> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }

    public run(): Promise<string> {
        return this.match({
            'hb Profile': (target, member) => {
                expectTypeOf(target).toEqualTypeOf<APIUser>();
                expectTypeOf(member).toEqualTypeOf<APIInteractionDataResolvedGuildMember | null>();
                return `profile:${target.username}:${member?.nick ?? 'none'}`;
            },
            'hb Greet': (target) => `greet:${target.username}`
        });
    }

    public runPartial(): Promise<string> {
        const arms = { 'hb Profile': () => 'profile' };
        // justified: reaching the runtime throw means dropping an arm past the compiler
        return this.match(arms as unknown as { 'hb Profile': () => string; 'hb Greet': () => string });
    }

    public readName(): 'hb Profile' | 'hb Greet' {
        return this.commandName;
    }
}

class Tools extends MessageContextMenuHandler<'hb Report' | 'hb Pin'> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }

    public run(): Promise<string> {
        return this.match({
            'hb Report': (message) => {
                expectTypeOf(message).toEqualTypeOf<APIMessage>();
                return `reported ${message.id}`;
            },
            'hb Pin': (message) => `pinned ${message.id}`
        });
    }
}

class MissingArm extends UserContextMenuHandler<'hb Profile' | 'hb Greet'> {
    public async execute(): Promise<void> {
        // @ts-expect-error every name in the generic needs an arm.
        await this.match({
            'hb Profile': () => undefined
        });
    }
}
void MissingArm;

class UnknownArm extends UserContextMenuHandler<'hb Profile'> {
    public async execute(): Promise<void> {
        await this.match({
            'hb Profile': () => undefined,
            // @ts-expect-error 'hb Greet' is not one of this handler's registered names.
            'hb Greet': () => undefined
        });
    }
}
void UnknownArm;

describe('http context menu match', () => {
    it('runs the arm for the command that fired', async () => {
        await expect(new Menu(userMenuEvent('hb Profile'), core).run()).resolves.toBe('profile:dhruv:dee');
        await expect(new Menu(userMenuEvent('hb Greet'), core).run()).resolves.toBe('greet:dhruv');
    });

    it('hands a message arm the clicked message', async () => {
        await expect(new Tools(messageMenuEvent('hb Pin'), core).run()).resolves.toBe('pinned msg1');
    });

    it('throws when the fired command has no arm', async () => {
        await expect(new Menu(userMenuEvent('hb Greet'), core).runPartial()).rejects.toSatisfy((error: unknown) =>
            isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ContextMenuMatchArmMissing)
        );
    });

    it('throws for a command named after an Object.prototype member', async () => {
        await expect(new Menu(userMenuEvent('constructor'), core).run()).rejects.toSatisfy((error: unknown) =>
            isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ContextMenuMatchArmMissing)
        );
    });

    it('reads the fired command name without an arm', () => {
        expect(new Menu(userMenuEvent('hb Greet'), core).readName()).toBe('hb Greet');
    });
});
