import { interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { MessageFlags } from 'discord-api-types/v10';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { dispatchInteraction } from '#src/dispatch/dispatchInteraction';
import { testCore } from '#tests/helpers/core';
import { VALID_TOKEN } from '#tests/helpers/fixtures';
import { resolvedSlash } from '#tests/helpers/interactions';
import { restClients } from '#tests/helpers/restClients';

import type { HandlerSlots, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpConfig } from '#interfaces/Config';
import type { InteractionKind } from '@seedcord/core';
import type { SendOpts } from '@seedcord/types';

function configWith(ephemeral: boolean | undefined): HttpConfig {
    return {
        bot: {
            interactions: { path: 'handlers', ...(ephemeral !== undefined && { ephemeral }) },
            commands: { path: null }
        },
        subscribers: { path: null }
    };
}

function replying(opts?: SendOpts): HandlerSlots[InteractionKind.Slash] {
    return class Replying extends SlashHandler<never> {
        async execute(): Promise<void> {
            await this.reply('hi', opts);
        }
    };
}

function deferring(): HandlerSlots[InteractionKind.Slash] {
    return class Deferring extends SlashHandler<never> {
        async execute(): Promise<void> {
            await this.defer();
            await this.followUp('more');
        }
    };
}

// a callback nests flags under data, and a followUp's body has them at the top
interface PostedBody {
    flags?: number;
    data?: { flags?: number };
}

// the Ephemeral bit of every body that the run posted, in order
async function ephemeralBits(config: HttpConfig, ctor: HandlerSlots[InteractionKind.Slash]): Promise<number[]> {
    const core = testCore(config, VALID_TOKEN);
    const execute = await dispatchInteraction({
        resolved: resolvedSlash('hi', ctor),
        core,
        middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
    });
    await execute?.();
    // justified: the fake REST records each post as [route, options], and every post here has a body
    const calls = (restClients().at(-1)?.post.mock.calls ?? []) as [string, { body: PostedBody }][];
    return calls.map(([, { body }]) => (body.data?.flags ?? body.flags ?? 0) & MessageFlags.Ephemeral);
}

beforeEach(() => {
    restClients().length = 0;
    Envapter.useSource(new PortableSource({}));
});

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('the interactions ephemeral default', () => {
    it('keeps replies ephemeral when the config leaves it out', async () => {
        expect(await ephemeralBits(configWith(undefined), replying())).toEqual([MessageFlags.Ephemeral]);
    });

    it('sends a public reply when the config sets it false', async () => {
        expect(await ephemeralBits(configWith(false), replying())).toEqual([0]);
    });

    it('lets one reply opt back into ephemeral', async () => {
        expect(await ephemeralBits(configWith(false), replying({ ephemeral: true }))).toEqual([MessageFlags.Ephemeral]);
    });

    it('keeps the unhandled fallback reply ephemeral when the config sets it false', async () => {
        expect(await ephemeralBits(configWith(false), UnhandledRepliable)).toEqual([MessageFlags.Ephemeral]);
    });

    it('fills a public placeholder with the fault card after a defer', async () => {
        class DefersThenThrows extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.defer();
                throw new Error('boom');
            }
        }

        expect(await ephemeralBits(configWith(false), DefersThenThrows)).toEqual([0]);
        expect(restClients().at(-1)?.patch.mock.calls[0]?.[0]).toMatch(/\/messages\/@original$/);
    });

    it('applies to a defer and the followUp after it', async () => {
        expect(await ephemeralBits(configWith(false), deferring())).toEqual([0, 0]);
    });
});
