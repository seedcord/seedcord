import { Events } from 'discord.js';
import { EventMiddleware, Logger, Middleware, MiddlewareType } from 'seedcord';

/**
 * Logs incoming interactions before handlers execute.
 */
@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate, Events.MessageDelete, Events.MessageUpdate] })
export class MiddlewareLogger0 extends EventMiddleware<
    Events.MessageCreate | Events.MessageDelete | Events.MessageUpdate
> {
    public async execute(): Promise<void> {
        const message = this.event[0];
        Logger.Info(
            'Event Middleware',
            `event received → Priority 0 by ${message.author?.username} (${message.author?.id})`
        );
        await message.react('🧠');

        await Promise.resolve();
    }
}
