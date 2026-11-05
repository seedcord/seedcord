import { InteractionMiddleware, RegisterInteractionMiddleware } from '@seedcord/http';

@RegisterInteractionMiddleware()
export class RequestLog extends InteractionMiddleware {
    public async execute(): Promise<void> {
        this.logger.info(`${this.dispatch.routeId} from ${this.user.username}`);

        await Promise.resolve();
    }
}
