import { CommandMentions, Gated, GuildOnly, RequirePermissions, SlashHandler, SlashRoute } from '@seedcord/gateway';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

import { MaintenanceEmbed } from '../components/bundles/Maintenance';

@Gated(GuildOnly(), RequirePermissions([PermissionFlagsBits.Administrator]))
@SlashRoute('maintenance')
export class Maintenance extends SlashHandler<'maintenance'> {
    public async execute(): Promise<void> {
        await this.event.deferReply({ flags: MessageFlags.Ephemeral });

        const notify = this.options.getUser('notify'); // User, required so never null
        const reason = this.options.getString('reason'); // string | null
        const target = this.options.getChannel('target'); // TextChannel | NewsChannel, required so never null

        await target.send({
            embeds: [new MaintenanceEmbed(this.event.client).component]
        });

        await this.event.editReply({
            content:
                `Maintenance message sent to <#${target.id}>, notified <@${notify.id}>${reason ? ` (${reason})` : ''}.\n` +
                `- ${CommandMentions['test/confirmable/v2']}\n` +
                `- ${CommandMentions.maintenance}\n` +
                `- ${CommandMentions.probe}\n` +
                `- ${CommandMentions.throw}\n`
        });
    }
}
