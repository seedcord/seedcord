import { Middleware, MiddlewareType, InteractionMiddleware, type Repliables } from 'seedcord';

/**
 * Logs incoming interactions before handlers execute.
 */
@Middleware(MiddlewareType.Interaction, 2)
export class InteractionLogger2 extends InteractionMiddleware<Repliables> {
    public async execute(): Promise<void> {
        this.logger.info(`interaction received → Priority 2 by ${this.event.user.username} (${this.event.user.id})`);

        await Promise.resolve();
    }
}
