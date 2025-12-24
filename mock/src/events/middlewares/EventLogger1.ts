import { Events } from 'discord.js';
import { EventMiddleware, Middleware, MiddlewareType } from 'seedcord';

/**
 * Logs incoming interactions before handlers execute.
 */
@Middleware(MiddlewareType.Event, 1, { events: [Events.MessageCreate, Events.MessageDelete, Events.MessageUpdate] })
export class MiddlewareLogger1 extends EventMiddleware<
    Events.MessageCreate | Events.MessageDelete | Events.MessageUpdate
> {
    public async execute(): Promise<void> {
        const message = this.event[0];
        this.logger.info(`event received → Priority 1 by ${message.author?.username} (${message.author?.id})`);
        await message.react('🫀');

        await Promise.resolve();
    }
}
