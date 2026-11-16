import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { Repliables } from '#handlers/interactionTypes';

// dispatch falls back here when the interaction doesn't match a manifest row
// a reply failure here reaches the dispatch fault boundary directly
export class UnhandledRepliable extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply('Feature not implemented yet.', { ephemeral: true });
    }
}
