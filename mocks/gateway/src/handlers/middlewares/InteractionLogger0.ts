import { Middleware, MiddlewareType, InteractionMiddleware, type Repliables } from '@seedcord/gateway';

@Middleware(MiddlewareType.Interaction, 0)
export class InteractionLogger0 extends InteractionMiddleware<Repliables> {
    public async execute(): Promise<void> {
        this.logger.info(`interaction received → Priority 0 by ${this.event.user.username} (${this.event.user.id})`);

        await Promise.resolve();
    }
}
