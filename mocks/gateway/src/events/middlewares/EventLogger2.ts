import { EventMiddleware, Middleware, MiddlewareType } from '@seedcord/gateway';

/**
 * a catchall middleware. with no `{ events }` filter, `this.event` is `never`, so the fired event is read from
 * `this.eventName`.
 */
@Middleware(MiddlewareType.Event, 2)
export class MiddlewareLogger2 extends EventMiddleware {
    public async execute(): Promise<void> {
        this.logger.info(`event → Priority 2 (${this.eventName})`);
        await Promise.resolve();
    }
}
