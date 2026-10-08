import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import { applicationIdFromToken } from '@seedcord/errors/internal';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';

import { edgeRestOptions, edgeShutdown, edgeStartup } from '#src/edge/runtime';

import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';
import type { IRateLimiter, TypedOmit } from '@seedcord/types';

type CoreDraft = TypedOmit<Core, 'bus'> & { bus: Bus };

// a Core for tests that call dispatchInteraction directly, with no host behind it
export function testCore(config: HttpConfig, token: string): Core {
    const rateLimiter: IRateLimiter = config.store ?? new MemoryRateLimiter();
    // justified: bus completes the shape on the next line. the Bus reads core at dispatch, never here.
    const draft = {
        config,
        rateLimiter,
        rest: new REST(edgeRestOptions(config.bot.restOptions)).setToken(token),
        shutdown: edgeShutdown,
        startup: edgeStartup,
        get applicationId(): string {
            return applicationIdFromToken(token);
        }
    } as CoreDraft;
    draft.bus = new Bus(draft);
    return draft;
}
