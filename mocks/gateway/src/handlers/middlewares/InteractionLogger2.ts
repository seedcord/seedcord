import { InteractionMiddleware, RegisterInteractionMiddleware } from '@seedcord/gateway';

@RegisterInteractionMiddleware({ priority: 2 })
export class InteractionLogger2 extends InteractionMiddleware {
    public execute(): void {
        this.logger.info(`interaction received → Priority 2 by ${this.event.user.username} (${this.event.user.id})`);
    }
}
