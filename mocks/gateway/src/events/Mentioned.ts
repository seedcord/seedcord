import { EventHandler, Gated, IgnoreBots, MentionPrefix, RegisterEvent } from '@seedcord/gateway';
import { Events } from 'discord.js';

@Gated(IgnoreBots, MentionPrefix)
@RegisterEvent([Events.MessageCreate])
export class Mentioned extends EventHandler<Events.MessageCreate> {
    public async execute(): Promise<void> {
        const [message] = this.event;
        await message.reply(`hey ${message.author.displayName}`);
    }
}
