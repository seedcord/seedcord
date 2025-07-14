import { ChatInputCommandInteraction, MessageFlags, TextChannel } from 'discord.js';
import { InteractionHandler } from '../interfaces/Handler';
import { Catchable } from '../decorators/Catchable';
import { MaintenenaceEmbed } from '../components/bundles/Maintenance';
import { SlashRoute } from '../decorators/InteractionConfigurable';

@SlashRoute('maintenance')
export class Maintenance extends InteractionHandler<ChatInputCommandInteraction> {
  @Catchable()
  public async execute(): Promise<void> {
    await this.event.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = this.event.channel as TextChannel;

    await channel.send({
      embeds: [new MaintenenaceEmbed(this.event.client).component]
    });

    await this.event.editReply({
      content: 'Maintenance message sent.'
    });
  }
}
