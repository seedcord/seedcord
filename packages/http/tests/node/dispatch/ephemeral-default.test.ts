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

function configWith(ephemeral: boolean): HttpConfig {
    return {
        bot: {
            interactions: { path: 'handlers', ephemeral },
            commands: { path: null }
        },
        subscribers: { path: null }
    };
}

class Replying extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('hi');
    }
}

// a callback nests flags under data
interface PostedBody {
    data?: { flags?: number };
}

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
    return calls.map(([, { body }]) => (body.data?.flags ?? 0) & MessageFlags.Ephemeral);
}

beforeEach(() => {
    restClients().length = 0;
    Envapter.useSource(new PortableSource({}));
});

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('the interactions ephemeral default', () => {
    it('sends a public reply when the config sets it false', async () => {
        expect(await ephemeralBits(configWith(false), Replying)).toEqual([0]);
    });

    it('keeps the unhandled fallback reply ephemeral when the config sets it false', async () => {
        expect(await ephemeralBits(configWith(false), UnhandledRepliable)).toEqual([MessageFlags.Ephemeral]);
    });
});
