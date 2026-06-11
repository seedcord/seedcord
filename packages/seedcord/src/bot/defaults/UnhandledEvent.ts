import { MessageFlags } from 'discord.js';

import { Catchable } from '@bDecorators/Catchable';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { Repliables } from '@handlers/BaseHandler';

/**
 * Default handler for unhandled interactions.
 *
 * @internal
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
