import { MessageFlags } from 'discord.js';

import { Catchable } from '@bDecorators/Catchable';
import { InteractionHandler, Repliables } from '@interfaces/Handler';

/**
 * Default handler for unhandled interaction.
 */
export class UnhandledEvent extends InteractionHandler<Repliables> {
    @Catchable()
    async execute(): Promise<void> {
        await this.event.reply({
            content: `Feature not implemented yet.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
