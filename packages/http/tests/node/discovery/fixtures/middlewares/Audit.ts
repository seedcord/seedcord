import { RegisterInteractionMiddleware } from '@seedcord/core';

import { InteractionMiddleware } from '#handlers/interaction';

import { ran } from './recorder';

@RegisterInteractionMiddleware()
export class Audit extends InteractionMiddleware {
    public execute(): Promise<void> {
        ran.push('Audit');
        return Promise.resolve();
    }
}
