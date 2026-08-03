import { EventMiddleware, Middleware, MiddlewareType } from '@seedcord/gateway';
import { Events } from 'discord.js';

/**
 * Logs which message event fired across create, delete, and update. A multi-event middleware runs the same for
 * every event it lists, so `this.event` is `never` and the fired event is read from `this.eventName`.
 */
@Middleware(MiddlewareType.Event, 1, { events: [Events.MessageCreate, Events.MessageDelete, Events.MessageUpdate] })
export class MiddlewareLogger1 extends EventMiddleware<
    Events.MessageCreate | Events.MessageDelete | Events.MessageUpdate
> {
    public async execute(): Promise<void> {
        this.logger.info(`message event → Priority 1 (${this.eventName})`);
        await Promise.resolve();
    }
}
