import { ChatInputCommandInteraction } from 'discord.js';
import { Catchable, InteractionHandler, SlashRoute } from 'seedcord';

@SlashRoute('throw')
export class TestError extends InteractionHandler<ChatInputCommandInteraction> {
  @Catchable()
  async execute(): Promise<void> {
    await Promise.resolve();
    throw new Error('Test error');
  }
}
