import { Events } from 'discord.js';
import { EventHandler, RegisterEvent } from 'seedcord';

@RegisterEvent([Events.MessageCreate, { frequency: 'once' }], [Events.MessageUpdate])
export class PingPong extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    public async execute(): Promise<void> {
        const [initialMessage, updatedMessage] = this.event;
        const message = updatedMessage ?? initialMessage;

        if (!message.author || message.author.bot) return;
        if (message.content === 'ping') await message.reply('pong');
    }
}
