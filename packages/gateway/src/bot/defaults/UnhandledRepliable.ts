import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { Repliables } from '#src/handlers/interactionTypes';

export class UnhandledRepliable extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply("This doesn't do anything right now.", { ephemeral: true });
    }
}
