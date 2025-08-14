import { ChatInputCommandInteraction, MessageFlags, TextChannel } from 'discord.js';
import { Catchable, SlashRoute, InteractionHandler } from 'seedcord';

import { MaintenanceEmbed } from '../components/bundles/Maintenance';

@SlashRoute('maintenance')
export class Maintenance extends InteractionHandler<ChatInputCommandInteraction> {
  @Catchable()
  public async execute(): Promise<void> {
    await this.event.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = this.event.channel as TextChannel;

    await channel.send({
      embeds: [new MaintenanceEmbed(this.event.client).component]
    });

    await this.event.editReply({
      content: 'Maintenance message sent.'
    });
  }
}
