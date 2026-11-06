import { EventMiddleware, RegisterEventMiddleware } from '@seedcord/gateway';
import { Events } from 'discord.js';

/**
 * a multi-event middleware runs the same for every event it lists. `this.route` holds the
 * current event name, since `this.event` is `never` here.
 */
@RegisterEventMiddleware({
    events: [Events.MessageCreate, Events.MessageDelete, Events.MessageUpdate],
    priority: 1
})
export class MiddlewareLogger1 extends EventMiddleware<
    Events.MessageCreate | Events.MessageDelete | Events.MessageUpdate
> {
    public execute(): void {
        this.logger.info(`message event → Priority 1 (${this.route})`);
    }
}
