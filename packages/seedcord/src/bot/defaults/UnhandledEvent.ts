import { MessageFlags } from 'discord.js';

import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { Repliables } from '@handlers/BaseHandler';

/**
 * Default handler for unhandled interactions. A reply failure here rides the controller boundary as a
 * raw fault, so it needs no decorator of its own.
 *
 * @internal
 */
export class UnhandledEvent extends InteractionHandler<Repliables> {
    async execute(): Promise<void> {
        await this.event.reply({
            content: `Feature not implemented yet.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
