import { TextDisplayBuilder } from '@discordjs/builders';
import { ApplicationCommandType, MessageFlags } from 'discord.js';
import { ContextMenuHandler, ContextMenuRoute, Cooldown, Gated, Notice } from 'seedcord';

import type { ReplyResponse } from 'seedcord';

class ProfileCooldown extends Notice {
    public constructor(private readonly expires: number) {
        super('profile lookups are rate limited');
    }

    public render(): ReplyResponse {
        const text = new TextDisplayBuilder().setContent(
            `Slow down. You can view another profile <t:${Math.round(this.expires / 1000)}:R>.`
        );
        return { components: [text] };
    }
}

@Gated(Cooldown('1m', { limit: 2, notice: (expires) => new ProfileCooldown(expires) }))
@ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
export class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {
    public async execute(): Promise<void> {
        const user = this.target;

        await this.event.reply({
            content: `Profile for ${user.tag} (joined Discord <t:${Math.floor(user.createdTimestamp / 1000)}:R>).`,
            flags: MessageFlags.Ephemeral
        });
    }
}
