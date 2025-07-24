import { MessageFlags } from 'discord.js';

import { ErrorHandlingUtils } from '../utilities/ErrorHandlingUtils';

import type { RepliableInteractionHandler } from '../interfaces/Handler';

interface CatchableOptions {
  log?: boolean;
  forceFollowup?: boolean;
}
export function Catchable(options?: CatchableOptions) {
  return function (
    _target: RepliableInteractionHandler,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<void>>
  ): void {
    const log = options?.log ?? false;
    const forceFollowup = options?.forceFollowup ?? false;

    const originalMethod = descriptor.value;

    descriptor.value = async function (this: RepliableInteractionHandler, ...args: any[]): Promise<void> {
      const interaction = this.getEvent();

      if (!originalMethod) throw new Error('Method not found');

      try {
        await originalMethod.apply(this, args);
      } catch (error) {
        if (!(error instanceof Error)) throw error;

        this.setErrored();

        // eslint-disable-next-line no-console
        if (log) console.error(error);

        const { response } = ErrorHandlingUtils.handleError(error, this.core, interaction.guild, interaction.user);

        const res = {
          embeds: [response],
          components: []
        };

        if (forceFollowup) {
          await interaction.followUp({ flags: MessageFlags.Ephemeral, ...res });
          return;
        }

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
