import { Events, type Message, type PartialMessage } from 'discord.js';
import { EventHandler, Gated, IgnoreBots, RegisterEvent } from '@seedcord/gateway';

@Gated(IgnoreBots)
@RegisterEvent([Events.MessageCreate, { frequency: 'once' }], [Events.MessageUpdate])
export class PingPong extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    public async execute(): Promise<void> {
        await this.match({
            [Events.MessageCreate]: (message) => this.pong(message),
            [Events.MessageUpdate]: (_oldMessage, newMessage) => this.pong(newMessage)
        });
    }

    private async pong(message: Message | PartialMessage): Promise<void> {
        if (message.content === 'ping') await message.reply('pong');
    }
}
