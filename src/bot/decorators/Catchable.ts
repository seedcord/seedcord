import { MessageFlags } from 'discord.js';

import type { RepliableInteractionHandler } from '../interfaces/Handler';

export function Catchable(log?: boolean) {
  return function (
    _target: RepliableInteractionHandler,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<void>>
  ): void {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: RepliableInteractionHandler, ...args: any[]): Promise<void> {
      const interaction = this.getEvent();

      if (!originalMethod) {
        throw new Error('Method not found');
      }

      try {
        await originalMethod.apply(this, args);
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }

        this.setErrored();

        // eslint-disable-next-line no-console
        if (log) console.error(error);

        const res = {
          embeds: [this.core.bot.errors.getErrorEmbed(error, interaction.guild, interaction.user).component],
          components: []
        };

        if (interaction.replied) {
          await interaction.followUp({ flags: MessageFlags.Ephemeral, ...res });
        } else if (interaction.deferred) {
          await interaction.editReply(res);
        } else {
          await interaction.reply({ flags: MessageFlags.Ephemeral, ...res });
        }
      }
    };
  };
}
