import { EventMiddleware, Middleware, MiddlewareType } from '@seedcord/gateway';

/**
 * A catchall that logs every client event before its handlers run. With no `{ events }` filter `this.event` is
 * `never`, so the fired event is read from `this.eventName`.
 */
@Middleware(MiddlewareType.Event, 2)
export class MiddlewareLogger2 extends EventMiddleware {
    public async execute(): Promise<void> {
        this.logger.info(`event → Priority 2 (${this.eventName})`);
        await Promise.resolve();
    }
}
