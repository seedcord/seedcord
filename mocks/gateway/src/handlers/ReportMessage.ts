import { MessageContextMenuRoute, MessageContextMenuHandler } from '@seedcord/gateway';

@MessageContextMenuRoute('Report Message')
export class ReportMessage extends MessageContextMenuHandler<'Report Message'> {
    public async execute(): Promise<void> {
        const message = this.target;

        await this.reply(`Reported message ${message.id} from <@${message.author.id}>.`);
    }
}
