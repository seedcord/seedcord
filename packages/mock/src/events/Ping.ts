import { Events } from 'discord.js';
import { EventHandler, RegisterEvent } from 'seedcord';

@RegisterEvent(Events.MessageCreate)
@RegisterEvent(Events.MessageUpdate)
export class PingPong extends EventHandler<Events.MessageCreate> {
    public async execute(): Promise<void> {
        const message = this.event[0];
        if (message.author.bot) return;
        if (message.content === 'ping') await message.reply('pong');
    }
}
