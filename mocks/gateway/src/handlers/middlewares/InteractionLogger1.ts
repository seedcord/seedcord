import { Middleware, MiddlewareType, InteractionMiddleware, type Repliables } from '@seedcord/gateway';

@Middleware(MiddlewareType.Interaction, 1)
export class InteractionLogger1 extends InteractionMiddleware<Repliables> {
    public async execute(): Promise<void> {
        this.logger.info(`interaction received → Priority 1 by ${this.event.user.username} (${this.event.user.id})`);

        await Promise.resolve();
    }
}
