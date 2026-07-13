import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { Repliables } from '@handlers/BaseHandler';

/**
 * Default handler for interactions no manifest row matches. A reply failure here
 * goes directly to the dispatch fault boundary, so it needs no guard of its own.
 *
 * @internal
 */
export class UnhandledEvent extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply('Feature not implemented yet.');
    }
}
