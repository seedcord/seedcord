import { InteractionKind } from '@seedcord/core';
import { vi } from 'vite-plus/test';

import type { HandlerSlots, ResolvedInteraction } from '#handlers/constructors';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';

// what resolve() returns for a slash command, for a test that calls dispatchInteraction directly
export function resolvedSlash(
    route: string,
    ctor: HandlerSlots[InteractionKind.Slash],
    payload: object = slashPayload(route)
): ResolvedInteraction<InteractionKind.Slash> {
    // justified: the payload has every field that the dispatch reads off a chat input command
    const event = payload as APIChatInputApplicationCommandInteraction;
    return { kind: InteractionKind.Slash, route, fallback: false, ctor, event };
}

export function slashPayload(name: string): object {
    // the builder reads app_permissions unconditionally, like the gateway does
    return {
        type: 2,
        id: 'int-1',
        application_id: 'app-1',
        token: 'tok',
        app_permissions: '0',
        // discord sends member in a guild and user in a dm
        user: { id: 'u1', username: 'tester' },
        data: { type: 1, name }
    };
}

export interface CapturedCtx {
    waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>>;
    settled: () => Promise<unknown>;
}

export function capturingCtx(): CapturedCtx {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    return {
        waitUntil,
        // the loop also reaches calls that a running promise adds while it waits
        settled: async () => {
            if (waitUntil.mock.calls.length === 0) throw new Error('waitUntil was never called');
            for (const [work] of waitUntil.mock.calls) await work;
            return undefined;
        }
    };
}
