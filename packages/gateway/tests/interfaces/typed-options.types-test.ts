import { expectTypeOf } from 'vitest';

import type { SlashOptions } from '#inputs/SlashOptions';
import type { GuildMember, User } from 'discord.js';

// augment the registry exactly as `seedcord codegen` would emit it for one command
declare module '@seedcord/core' {
    interface SlashRegistry {
        ban: {
            options: {
                target: { kind: 'user'; required: true };
                reason: { kind: 'string'; required: false };
                scope: { kind: 'string'; required: true; choices: ['guild', 'global'] };
            };
            cache: 'cached';
        };
    }
}

function typeChecks(options: SlashOptions<'ban'>): void {
    expectTypeOf(options.getUser('target')).toEqualTypeOf<User>();
    expectTypeOf(options.getString('reason')).toEqualTypeOf<string | null>();
    expectTypeOf(options.getString('scope')).toEqualTypeOf<'guild' | 'global'>();
    expectTypeOf(options.getMember('target')).toEqualTypeOf<GuildMember | null>();

    // @ts-expect-error 'nope' is not an option on this command.
    void options.getUser('nope');
    // @ts-expect-error 'target' is a user option, not a string option.
    void options.getString('target');
    // @ts-expect-error this command has no integer option, so getInteger does not exist.
    void options.getInteger;
    // @ts-expect-error this command has no channel option, so getChannel does not exist.
    void options.getChannel;
}

void typeChecks;
