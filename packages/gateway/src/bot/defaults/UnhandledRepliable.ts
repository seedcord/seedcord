import { UNHANDLED_REPLY } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { Repliables } from '#src/handlers/interactionTypes';

export class UnhandledRepliable extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.reply(UNHANDLED_REPLY, { ephemeral: true });
    }
}
