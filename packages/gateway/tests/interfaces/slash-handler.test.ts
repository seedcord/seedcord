import { SlashRoute } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { SlashOptions } from '#inputs/SlashOptions';
import type { Core } from '#interfaces/Core';
import type { ChatInputCommandInteraction, CommandInteractionOption, User } from 'discord.js';

// Compile-time spec for SlashHandler. The execute() bodies are typechecked but never run, so each guarded
// mistake below fails the build if it stops being a compile error. Distinct routes from typed-options.test.ts
// avoid a duplicate registry augmentation.
declare module '@seedcord/core' {
    interface SlashRegistry {
        kick: { options: { member: { kind: 'user'; required: true } }; cache: 'cached' };
        warn: {
            options: { user: { kind: 'user'; required: true }; reason: { kind: 'string'; required: false } };
            cache: 'cached';
        };
        mute: {
            options: { target: { kind: 'user'; required: true }; minutes: { kind: 'integer'; required: true } };
            cache: 'cached';
        };
        note: {
            options: { target: { kind: 'user'; required: true }; text: { kind: 'string'; required: true } };
            cache: 'cached';
        };
        'demo/setup': { options: { channel: { kind: 'channel'; required: true } }; cache: 'cached' };
    }
}

// a single-command handler reads this.options typed for its route
class KickHandler extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getUser('member')).toEqualTypeOf<User>();
        await Promise.resolve();
    }
}
void KickHandler;

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
void ModerationHandler;

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
void MissingArm;

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
void CrossRoute;

// @SlashRoute routes must match the handler generic exactly, in both directions.
@SlashRoute('kick')
class DecoratedSingle extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedSingle;

@SlashRoute('kick', 'warn')
class DecoratedMulti extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void DecoratedMulti;

// the handler declares a route the decorator omits
// @ts-expect-error 'warn' is in the generic but not listed on the decorator.
@SlashRoute('kick')
class OmitsRoute extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void OmitsRoute;

// the decorator lists a route the handler does not declare
// @ts-expect-error 'warn' is listed on the decorator but not in the generic.
@SlashRoute('kick', 'warn')
class ExtraRoute extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void ExtraRoute;

// this.options on a union route keeps only the options common to every member route
class UnionOptionsHandler extends SlashHandler<'mute' | 'note'> {
    async execute(): Promise<void> {
        // 'target' is a user option on both mute and note, so it survives the union and stays typed
        expectTypeOf(this.options.getUser('target')).toEqualTypeOf<User>();
        // @ts-expect-error mute has an integer option but note does not, so getInteger is absent on the union.
        void this.options.getInteger;
        // @ts-expect-error note has a string option but mute does not, so getString is absent on the union.
        void this.options.getString;
        await Promise.resolve();
    }
}

// each match arm is typed for its own route, recovering getters the union view drops
class PerArmNarrowing extends SlashHandler<'mute' | 'note'> {
    async execute(): Promise<void> {
        await this.match({
            mute: (options) => {
                expectTypeOf(options.getInteger('minutes')).toEqualTypeOf<number>();
            },
            note: (options) => {
                expectTypeOf(options.getString('text')).toEqualTypeOf<string>();
            }
        });
    }
}

// an arm keyed by a route outside the handler's union is rejected
class ExtraArmHandler extends SlashHandler<'mute' | 'note'> {
    async execute(): Promise<void> {
        await this.match({
            mute: (options) => {
                void options.getInteger('minutes');
            },
            note: (options) => {
                void options.getString('text');
            },
            // @ts-expect-error 'warn' is not a route this handler is registered for.
            warn: (_options: SlashOptions<'warn'>) => {
                void 0;
            }
        });
    }
}

// a subcommand (slash-path) route is a normal registry key for both the decorator and this.options
@SlashRoute('demo/setup')
class SubcommandHandler extends SlashHandler<'demo/setup'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getChannel('channel')).toEqualTypeOf<
            NonNullable<CommandInteractionOption<'cached'>['channel']>
        >();
        await Promise.resolve();
    }
}

// the decorator only accepts registered routes, the keyof constraint that also drives route autocomplete
// @ts-expect-error 'ghost' is not a key of SlashRegistry.
@SlashRoute('ghost')
class UnknownDecoratorRoute extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the SlashHandler generic itself is constrained to registered routes
// @ts-expect-error 'ghost' is not a key of SlashRegistry.
class UnknownGenericRoute extends SlashHandler<'ghost'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// justified: match reads only commandName and the sub getters off the event
const core = {} as unknown as Core;
function slashInteraction(commandName: string): ChatInputCommandInteraction<'cached'> {
    return {
        commandName,
        options: { getSubcommandGroup: () => null, getSubcommand: () => null }
    } as unknown as ChatInputCommandInteraction<'cached'>;
}

describe('SlashHandler', () => {
    it('throws SlashMatchArmMissing for a prototype-named route with no arm', async () => {
        class Mod extends SlashHandler<'kick' | 'warn'> {
            async execute(): Promise<void> {
                await this.match({
                    kick: () => undefined,
                    warn: () => undefined
                });
            }
        }
        const handler = new Mod(slashInteraction('constructor'), core);
        await expect(handler.execute()).rejects.toMatchObject({
            code: SeedcordErrorCode.SlashMatchArmMissing
        });
    });

    it('exposes the additional typed slash handlers', () => {
        expect([
            UnionOptionsHandler,
            PerArmNarrowing,
            ExtraArmHandler,
            SubcommandHandler,
            UnknownDecoratorRoute,
            UnknownGenericRoute
        ]).toHaveLength(6);
    });
});
