import { InteractionMiddleware, RegisterInteractionMiddleware } from '@seedcord/gateway';

@RegisterInteractionMiddleware({ priority: 1 })
export class InteractionLogger1 extends InteractionMiddleware {
    public execute(): void {
        this.logger.info(`interaction received → Priority 1 by ${this.user.username} (${this.user.id})`);
    }
}
