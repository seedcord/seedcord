import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import { openKv } from '@seedcord/core/internal';
import { validateDiscordToken } from '@seedcord/errors/internal';

import { edgeRestOptions, edgeShutdown } from '#src/edge/defaults';

import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';
import type { TypedOmit } from '@seedcord/types';

type CoreDraft = TypedOmit<Core, 'bus'> & { bus: Bus };

// a Core for tests that call dispatchInteraction directly, with no host behind it
export function testCore(config: HttpConfig, token: string): Core {
    const { kv, rateLimiter } = openKv(config.kv);
    const startup: Core['startup'] = { addTask: () => undefined };
    // justified: bus completes the shape on the next line. the Bus reads core at dispatch, never here.
    const draft = {
        config,
        kv,
        rateLimiter,
        rest: new REST(edgeRestOptions(config.bot.restOptions)).setToken(token),
        shutdown: edgeShutdown,
        startup,
        get applicationId(): string {
            return validateDiscordToken(token).applicationId;
        }
    } as CoreDraft;
    draft.bus = new Bus(draft);
    return draft;
}
