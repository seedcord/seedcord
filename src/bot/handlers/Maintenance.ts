import { ChatInputCommandInteraction, MessageFlags, TextChannel } from 'discord.js';

import { MaintenanceEmbed } from '../components/bundles/Maintenance';
import { Catchable } from '../decorators/Catchable';
import { SlashRoute } from '../decorators/InteractionConfigurable';
import { InteractionHandler } from '../interfaces/Handler';

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
