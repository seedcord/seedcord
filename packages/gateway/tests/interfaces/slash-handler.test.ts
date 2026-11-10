import { SlashRoute } from '@seedcord/core';
import { DispatchContext } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it } from 'vite-plus/test';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { built } from '#tests/utils/built';

import type { SlashOptions } from '#inputs/SlashOptions';
import type { Core } from '#interfaces/Core';
import type { CacheType, ChatInputCommandInteraction, CommandInteractionOption, User } from 'discord.js';

const dispatch = new DispatchContext('slash', 'probe');

// the execute() bodies are typechecked and never run. every guarded mistake below fails the build the day it
// stops being a compile error. the routes differ from typed-options.test.ts to keep the augmentations apart.
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
        guildOnlyRole: { options: { role: { kind: 'role'; required: true } }; cache: 'cached' };
        anywhereRole: { options: { role: { kind: 'role'; required: true } }; cache: undefined };
    }
}

type RoleIn<Cache extends CacheType> = NonNullable<CommandInteractionOption<Cache>['role']>;

// a single-command handler reads this.options typed for its route
class KickHandler extends SlashHandler<'kick'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getUser('member')).toEqualTypeOf<User>();
        await Promise.resolve();
    }
}
void KickHandler;

// a multi-command handler branches with match, each case typed for its own route
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

// every route needs a case
class MissingCase extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        // @ts-expect-error the 'warn' case is missing.
        await this.match({
            kick: (options) => {
                void options.getUser('member');
            }
        });
    }
}
void MissingCase;

// a case cannot reach another route's option
class CrossRoute extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await this.match({
            kick: (options) => {
                // @ts-expect-error 'kick' doesn't declare a string option, so getString does not exist on its case.
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

// the handler declares a route that the decorator omits
// @ts-expect-error 'warn' is in the generic but not listed on the decorator.
@SlashRoute('kick')
class OmitsRoute extends SlashHandler<'kick' | 'warn'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void OmitsRoute;

// the decorator lists a route that the handler does not declare
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
        // 'target' is a user option on both mute and note, so it's still in the union, with its type
        expectTypeOf(this.options.getUser('target')).toEqualTypeOf<User>();
        // @ts-expect-error mute has an integer option but note does not, so getInteger is absent on the union.
        void this.options.getInteger;
        // @ts-expect-error note has a string option but mute does not, so getString is absent on the union.
        void this.options.getString;
        await Promise.resolve();
    }
}

// each match case is typed for its own route, recovering getters that the union view leaves out
class PerCaseNarrowing extends SlashHandler<'mute' | 'note'> {
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

class PerRouteCache extends SlashHandler<'guildOnlyRole' | 'anywhereRole'> {
    async execute(): Promise<void> {
        expectTypeOf(this.options.getRole('role')).toEqualTypeOf<RoleIn<undefined>>();
        await this.match({
            guildOnlyRole: (options) => {
                expectTypeOf(options.getRole('role')).toEqualTypeOf<RoleIn<'cached'>>();
            },
            anywhereRole: (options) => {
                expectTypeOf(options.getRole('role')).toEqualTypeOf<RoleIn<undefined>>();
            }
        });
    }
}

class WrittenCacheWins extends SlashHandler<'guildOnlyRole' | 'anywhereRole', 'cached'> {
    async execute(): Promise<void> {
        await this.match({
            guildOnlyRole: (options) => {
                expectTypeOf(options.getRole('role')).toEqualTypeOf<RoleIn<'cached'>>();
            },
            anywhereRole: (options) => {
                expectTypeOf(options.getRole('role')).toEqualTypeOf<RoleIn<'cached'>>();
            }
        });
    }
}

class MixedReturns extends SlashHandler<'mute' | 'note'> {
    async execute(): Promise<void> {
        const result = await this.match({
            mute: (options) => ({ minutes: options.getInteger('minutes') }),
            note: (options) => Promise.resolve({ text: options.getString('text') })
        });
        expectTypeOf(result).toEqualTypeOf<{ minutes: number } | { text: string }>();
    }
}

class DeclaredReturn extends SlashHandler<'mute' | 'note'> {
    async execute(): Promise<void> {
        const result = await this.match<{ text: string }>({
            mute: (options) => ({ text: String(options.getInteger('minutes')) }),
            note: (options) => Promise.resolve({ text: options.getString('text') })
        });
        expectTypeOf(result).toEqualTypeOf<{ text: string }>();

        await this.match<string>({
            mute: () => 'muted',
            // @ts-expect-error this case returns a number.
            note: () => 1
        });
    }
}

// a case keyed by a route outside the handler's union is rejected
class ExtraCaseHandler extends SlashHandler<'mute' | 'note'> {
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

// a named map skips TypeScript's excess property check on object literals
class NamedExtraCaseHandler extends SlashHandler<'mute' | 'note'> {
    async execute(): Promise<void> {
        const cases = { mute: () => 1, note: () => 'a', warn: () => true };
        // @ts-expect-error 'warn' is not a route this handler is registered for.
        await this.match(cases);
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

// the decorator only accepts registered routes, the same keyof constraint that gives route autocomplete its keys
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
    it('throws MatchCaseMissing for a prototype-named route with no case', async () => {
        class Mod extends SlashHandler<'kick' | 'warn'> {
            async execute(): Promise<void> {
                await this.match({
                    kick: () => undefined,
                    warn: () => undefined
                });
            }
        }
        const handler = built(Mod, slashInteraction('constructor'), core, dispatch);
        await expect(handler.execute()).rejects.toMatchObject({
            code: SeedcordErrorCode.MatchCaseMissing
        });
    });
});

void [
    UnionOptionsHandler,
    PerCaseNarrowing,
    PerRouteCache,
    WrittenCacheWins,
    MixedReturns,
    DeclaredReturn,
    ExtraCaseHandler,
    NamedExtraCaseHandler,
    SubcommandHandler,
    UnknownDecoratorRoute,
    UnknownGenericRoute
];
