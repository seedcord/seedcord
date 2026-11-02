import { InteractionMiddleware, RegisterInteractionMiddleware } from '@seedcord/http';

declare module '@seedcord/http' {
    interface DispatchState {
        actor: string;
    }
}

@RegisterInteractionMiddleware({ priority: 1 })
export class Actor extends InteractionMiddleware {
    public execute(): void {
        this.dispatch.set('actor', this.user.username);
    }
}
