import { DispatchContext } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { MessageContextMenuHandler, UserContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { built } from '#tests/helpers/built';

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

function userMenu(name: string): [APIUserApplicationCommandInteraction, Core, DispatchContext] {
    const event = {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 2,
        data: {
            id: 'c1',
            type: ApplicationCommandType.User,
            target_id: 'u1',
            resolved: { users: { u1: user }, members: { u1: { nick: 'dee' } } }
        }
    } as unknown as APIUserApplicationCommandInteraction;
    return [event, core, new DispatchContext('userContextMenu', name)];
}

function messageMenu(name: string): [APIMessageApplicationCommandInteraction, Core, DispatchContext] {
    const event = {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 2,
        data: {
            id: 'c1',
            type: ApplicationCommandType.Message,
            target_id: 'msg1',
            resolved: { messages: { msg1: { id: 'msg1' } } }
        }
    } as unknown as APIMessageApplicationCommandInteraction;
    return [event, core, new DispatchContext('messageContextMenu', name)];
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
        const cases = {
            'hb Profile': (): string => 'profile',
            'hb Greet': (): string => 'greet'
        };
        Reflect.deleteProperty(cases, 'hb Greet');
        return this.match(cases);
    }

    public async runMixed(): Promise<void> {
        const result = await this.match({ 'hb Profile': () => 'profile', 'hb Greet': () => 1 });
        expectTypeOf(result).toEqualTypeOf<string | number>();
    }

    public readName(): 'hb Profile' | 'hb Greet' {
        return this.route;
    }
}

class Tools extends MessageContextMenuHandler<'hb Report' | 'hb Pin'> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }

    public async runMixed(): Promise<void> {
        const result = await this.match({ 'hb Report': () => 'reported', 'hb Pin': () => 1 });
        expectTypeOf(result).toEqualTypeOf<string | number>();
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

class MissingCase extends UserContextMenuHandler<'hb Profile' | 'hb Greet'> {
    public async execute(): Promise<void> {
        // @ts-expect-error every name in the generic needs a case.
        await this.match({
            'hb Profile': () => undefined
        });
    }
}
void MissingCase;

class UnknownCase extends UserContextMenuHandler<'hb Profile'> {
    public async execute(): Promise<void> {
        await this.match({
            'hb Profile': () => undefined,
            // @ts-expect-error 'hb Greet' is not one of this handler's registered names.
            'hb Greet': () => undefined
        });
    }
}
void UnknownCase;

describe('http context menu match', () => {
    it('runs the case for the selected command', async () => {
        await expect(built(Menu, ...userMenu('hb Profile')).run()).resolves.toBe('profile:dhruv:dee');
        await expect(built(Menu, ...userMenu('hb Greet')).run()).resolves.toBe('greet:dhruv');
    });

    it('hands a message case the clicked message', async () => {
        await expect(built(Tools, ...messageMenu('hb Pin')).run()).resolves.toBe('pinned msg1');
    });

    it('throws when the selected command lacks a case', async () => {
        await expect(built(Menu, ...userMenu('hb Greet')).runPartial()).rejects.toSatisfy((error: unknown) =>
            isSeedcordError(error, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)
        );
    });

    it('throws for a command named after an Object.prototype member', async () => {
        await expect(built(Menu, ...userMenu('constructor')).run()).rejects.toSatisfy((error: unknown) =>
            isSeedcordError(error, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)
        );
    });

    it('reads the selected command name without a case', () => {
        expect(built(Menu, ...userMenu('hb Greet')).readName()).toBe('hb Greet');
    });
});
