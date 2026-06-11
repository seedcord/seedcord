import { ApplicationCommandType, MessageFlags } from 'discord.js';
import { Catchable, ContextMenuRoute, ContextMenuHandler } from 'seedcord';

@ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
export class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {
    @Catchable()
    public async execute(): Promise<void> {
        const user = this.target;

        await this.event.reply({
            content: `Profile for ${user.tag} (joined Discord <t:${Math.floor(user.createdTimestamp / 1000)}:R>).`,
            flags: MessageFlags.Ephemeral
        });
    }
}
