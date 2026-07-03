import { Silence } from '@seedcord/core';

import { defineGate } from '../Gate';

import type { EventGateContext } from '../Gate';

/**
 * Drops a client event whose actor is a bot, with a {@link Silence} so nothing is replied. Event-only, because a
 * Silence on an interaction would leave Discord's failed-interaction state. It rejects an interaction handler at
 * the decorator line. Takes no options, so attach it directly without calling it.
 *
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * import { Events } from 'discord.js';
 *
 * \@Gated(IgnoreBots)
 * class OnMessage extends EventHandler<Events.MessageCreate> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export const IgnoreBots = defineGate('IgnoreBots', (ctx: EventGateContext) => {
    if (ctx.user?.bot) throw new Silence('actor is a bot');
});
