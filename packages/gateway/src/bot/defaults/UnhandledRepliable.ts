import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { Repliables } from '@handlers/BaseHandler';

/**
 * @internal Default handler for unhandled repliable interactions.
 */
export class UnhandledRepliable extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply('Feature not implemented yet.');
    }
}
