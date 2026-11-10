import { Silence } from '@seedcord/core';
import { describe, it, expect } from 'vite-plus/test';

import { IgnoreBots } from '#bot/gates/catalog';

import type { EventGateContext } from '#bot/gates';

function actorCtx(isBot: boolean): EventGateContext {
    // a minimal cast stands in because the gate reads only the event actor's bot flag
    return { user: { bot: isBot } } as unknown as EventGateContext;
}

describe('IgnoreBots', () => {
    it('passes for a human actor', async () => {
        await expect(IgnoreBots.check(actorCtx(false))).resolves.toBeUndefined();
    });

    it('stops a bot actor with a Silence', async () => {
        await expect(IgnoreBots.check(actorCtx(true))).rejects.toBeInstanceOf(Silence);
    });
});
