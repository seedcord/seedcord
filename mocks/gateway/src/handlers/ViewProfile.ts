import { TextDisplayBuilder } from '@discordjs/builders';
import { UserContextMenuHandler, UserContextMenuRoute, Cooldown, Gated, Notice } from '@seedcord/gateway';

import type { ReplyResponse } from '@seedcord/gateway';

class ProfileCooldown extends Notice {
    public constructor(private readonly resetAt: number) {
        super('profile lookups are rate limited');
    }

    public render(): ReplyResponse {
        const text = new TextDisplayBuilder().setContent(
            `Slow down. You can view another profile <t:${Math.round(this.resetAt / 1000)}:R>.`
        );
        return { components: [text] };
    }
}

@Gated(Cooldown('1m', { limit: 2, notice: (resetAt) => new ProfileCooldown(resetAt) }))
@UserContextMenuRoute('View Profile')
export class ViewProfile extends UserContextMenuHandler<'View Profile'> {
    public async execute(): Promise<void> {
        const user = this.target;

        await this.reply(`Profile for ${user.tag} (joined Discord <t:${Math.floor(user.createdTimestamp / 1000)}:R>).`);
    }
}
