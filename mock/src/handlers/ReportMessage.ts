import { ApplicationCommandType, MessageFlags } from 'discord.js';
import { ContextMenuRoute, ContextMenuHandler } from 'seedcord';

@ContextMenuRoute(ApplicationCommandType.Message, 'Report Message')
export class ReportMessage extends ContextMenuHandler<ApplicationCommandType.Message> {
    public async execute(): Promise<void> {
        const message = this.target;

        await this.event.reply({
            content: `Reported message ${message.id} from <@${message.author.id}>.`,
            flags: MessageFlags.Ephemeral
        });
    }
}
