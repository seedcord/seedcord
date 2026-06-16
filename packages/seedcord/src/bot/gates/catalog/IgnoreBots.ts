import { Silence } from '@seedcord/kit';

import { defineGate } from '../Gate';

import type { EventGateContext, Gate } from '../Gate';

/** Drops a client event whose actor is a bot, with a {@link Silence} so nothing is replied. */
export function IgnoreBots(): Gate<EventGateContext, 'IgnoreBots'> {
    return defineGate('IgnoreBots', (ctx: EventGateContext) => {
        if (ctx.user?.bot) throw new Silence('actor is a bot');
    });
}
