import { EventHandler, Gated, IgnoreBots, RegisterEvent } from '@seedcord/gateway';
import { Events } from 'discord.js';

@Gated(IgnoreBots)
@RegisterEvent([Events.MessageCreate])
export class Mentioned extends EventHandler<Events.MessageCreate> {
    public async execute(): Promise<void> {
        const [message] = this.event;
        if (!message.inGuild()) return;

        // discord sends the content of a message that mentions your app without the privileged intent
        if (!message.mentions.users.has(message.client.user.id)) return;

        await message.reply(`hey ${message.author.displayName}`);
    }
}
