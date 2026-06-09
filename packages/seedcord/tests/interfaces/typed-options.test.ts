import { describe, expect, expectTypeOf, it } from 'vitest';

import type { TypedOptions } from '@interfaces/TypedOptions';
import type { GuildMember, User } from 'discord.js';

// Compile-time spec for TypedOptions. The assertions live in a function the typecheck validates but vitest
// never runs, so each @ts-expect-error fails the build if the guard it describes ever stops being an error.

// augment the registry exactly as `seedcord codegen` would emit it for one command
declare module '@seedcord/types' {
    interface SlashOptionRegistry {
        ban: {
            target: { kind: 'user'; required: true };
            reason: { kind: 'string'; required: false };
            scope: { kind: 'string'; required: true; choices: ['guild', 'global'] };
        };
    }
}

function typeChecks(options: TypedOptions<'ban'>): void {
    // a required option drops the null
    expectTypeOf(options.getUser('target')).toEqualTypeOf<User>();
    // an optional option is nullable, never undefined
    expectTypeOf(options.getString('reason')).toEqualTypeOf<string | null>();
    // choices narrow to their literal union
    expectTypeOf(options.getString('scope')).toEqualTypeOf<'guild' | 'global'>();
    // a user option also exposes getMember, always nullable
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

describe('TypedOptions', () => {
    it('exposes the type-checked option surface', () => {
        expect(typeof typeChecks).toBe('function');
    });
});
