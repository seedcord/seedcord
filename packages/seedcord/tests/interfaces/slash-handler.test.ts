import { describe, expect, expectTypeOf, it } from 'vitest';

import { SlashRoute } from '@bDecorators/Interactions';
import { SlashHandler } from '@interfaces/SlashHandler';

import type { User } from 'discord.js';

// Compile-time spec for SlashHandler. The execute() bodies are typechecked but never run, so each guarded
// mistake below fails the build if it stops being a compile error. Distinct routes from typed-options.test.ts
// avoid a duplicate registry augmentation.
declare module '@seedcord/types' {
    interface SlashOptionRegistry {
        kick: { member: { kind: 'user'; required: true } };
        warn: { user: { kind: 'user'; required: true }; reason: { kind: 'string'; required: false } };
    }
}

// a single-command handler reads this.options typed for its route
class KickHandler extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getUser('member')).toEqualTypeOf<User>();
        await Promise.resolve();
    }
}

// a multi-command handler branches with match, each arm typed for its own route
class ModerationHandler extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await this.match({
            kick: (options) => {
                expectTypeOf(options.getUser('member')).toEqualTypeOf<User>();
            },
            warn: (options) => {
                expectTypeOf(options.getString('reason')).toEqualTypeOf<string | null>();
            }
        });
    }
}

// every route needs an arm
class MissingArm extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        // @ts-expect-error the 'warn' arm is missing.
        await this.match({
            kick: (options) => {
                void options.getUser('member');
            }
        });
    }
}

// an arm cannot reach another route's option
class CrossRoute extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await this.match({
            kick: (options) => {
                // @ts-expect-error 'kick' has no string option, so getString does not exist on its arm.
                void options.getString;
            },
            warn: (options) => {
                void options.getString('reason');
            }
        });
    }
}

// @SlashRoute routes must match the handler generic exactly, in both directions.
@SlashRoute('kick')
class DecoratedSingle extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

@SlashRoute('kick', 'warn')
class DecoratedMulti extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the handler declares a route the decorator omits
// @ts-expect-error 'warn' is in the generic but not listed on the decorator.
@SlashRoute('kick')
class OmitsRoute extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the decorator lists a route the handler does not declare
// @ts-expect-error 'warn' is listed on the decorator but not in the generic.
@SlashRoute('kick', 'warn')
class ExtraRoute extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

describe('SlashHandler', () => {
    it('exposes the typed slash handlers', () => {
        expect([KickHandler, ModerationHandler, MissingArm, CrossRoute]).toHaveLength(4);
    });

    it('cross-checks @SlashRoute against the handler generic', () => {
        expect([DecoratedSingle, DecoratedMulti, OmitsRoute, ExtraRoute]).toHaveLength(4);
    });
});
