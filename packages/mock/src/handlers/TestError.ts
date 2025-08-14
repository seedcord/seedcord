import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Catchable, InteractionHandler, SlashRoute } from 'seedcord';

@SlashRoute('throw')
export class TestError extends InteractionHandler<ChatInputCommandInteraction> {
  @Catchable()
  async execute(): Promise<void> {
    // wait for 5 seconds to throw Unknown Interaction Error
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await this.event.reply({
      content: 'This is a test error',
      flags: MessageFlags.Ephemeral
    });
  }
}
