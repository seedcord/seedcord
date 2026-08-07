import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { Repliables } from '@handlers/interactionTypes';

// dispatch falls back here when no manifest row matches
// a reply failure here reaches the dispatch fault boundary directly
export class UnhandledRepliable extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply('Feature not implemented yet.');
    }
}
