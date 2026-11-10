import { InteractionKind, RegisterInteractionMiddleware } from '@seedcord/core';

import { InteractionMiddleware } from '#handlers/interaction';

@RegisterInteractionMiddleware({ kinds: [InteractionKind.Button], priority: 5 })
export class ButtonAudit extends InteractionMiddleware<InteractionKind.Button> {
    public execute(): Promise<void> {
        return Promise.resolve();
    }
}
