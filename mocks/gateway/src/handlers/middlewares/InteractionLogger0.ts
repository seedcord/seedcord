import { InteractionMiddleware, RegisterInteractionMiddleware } from '@seedcord/gateway';

@RegisterInteractionMiddleware()
export class InteractionLogger0 extends InteractionMiddleware {
    public execute(): void {
        this.logger.info(`interaction received → Priority 0 by ${this.event.user.username} (${this.event.user.id})`);
    }
}
