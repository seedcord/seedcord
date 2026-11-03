import { EventMiddleware, RegisterEventMiddleware } from '@seedcord/gateway';

/**
 * a catchall middleware. omitting `{ events }` leaves `this.event` as `never`. `this.route` holds
 * the current event name.
 */
@RegisterEventMiddleware({ priority: 2 })
export class MiddlewareLogger2 extends EventMiddleware {
    public execute(): void {
        this.logger.info(`event → Priority 2 (${this.route})`);
    }
}
