import { SlashHandler, SlashRoute } from '@seedcord/http';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const note = this.options.getString('note');

        await this.reply(`pong ${note}`);
    }
}
