import { MessageFlags } from 'discord.js';

import { Catchable } from '../decorators/Catchable';
import { InteractionHandler, Repliables } from '../interfaces/Handler';

export class UnhandledEvent extends InteractionHandler<Repliables> {
  @Catchable()
  async execute(): Promise<void> {
    await this.event.reply({
      content: `Feature not implemented yet.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
