import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { Repliables } from '@src/handlers/interactionTypes';

export class UnhandledRepliable extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply('Feature not implemented yet.');
    }
}
