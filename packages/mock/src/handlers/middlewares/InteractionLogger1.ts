import { Middleware, MiddlewareType, InteractionMiddleware, type Repliables, Logger } from 'seedcord';

/**
 * Logs incoming interactions before handlers execute.
 */
@Middleware(MiddlewareType.Interaction, 1)
export class InteractionLogger1 extends InteractionMiddleware<Repliables> {
    public async execute(): Promise<void> {
        Logger.Info(
            'Interaction Middleware',
            `interaction received → Priority 1 by ${this.event.user.username} (${this.event.user.id})`
        );

        await Promise.resolve();
    }
}
