import { Events } from 'discord.js';
import { EventMiddleware, Middleware, MiddlewareType } from 'seedcord';

/**
 * Reacts to new messages before the message handlers run. A single-event middleware, so `this.event` is the
 * typed messageCreate payload.
 */
@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate] })
export class MiddlewareLogger0 extends EventMiddleware<Events.MessageCreate> {
    public async execute(): Promise<void> {
        const [message] = this.event;
        this.logger.info(`message received → Priority 0 by ${message.author.username} (${message.author.id})`);
        await message.react('🧠');
    }
}
