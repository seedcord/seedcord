import { MessageFlags, TextChannel } from 'discord.js';
import { SlashRoute, SlashHandler } from 'seedcord';

import { MaintenanceEmbed } from '../components/bundles/Maintenance';

@SlashRoute('maintenance')
export class Maintenance extends SlashHandler<'maintenance'> {
    public async execute(): Promise<void> {
        await this.event.deferReply({ flags: MessageFlags.Ephemeral });

        const notify = this.options.getUser('notify'); // User, required so never null
        const reason = this.options.getString('reason'); // string | null
        const channel = this.event.channel as TextChannel;

        await channel.send({
            embeds: [new MaintenanceEmbed(this.event.client).component]
        });

        await this.event.editReply({
            content: `Maintenance message sent, notified <@${notify.id}>${reason ? ` (${reason})` : ''}.`
        });
    }
}
