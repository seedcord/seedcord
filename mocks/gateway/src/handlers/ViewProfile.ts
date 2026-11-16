import { TextDisplayBuilder } from '@discordjs/builders';
import {
    Cooldown,
    Gated,
    Notice,
    toEpochSeconds,
    UserContextMenuHandler,
    UserContextMenuRoute
} from '@seedcord/gateway';
import { time } from 'discord.js';

import type { EpochMs, RenderContext, ReplyResponse } from '@seedcord/gateway';

class ProfileCooldown extends Notice {
    public constructor(private readonly resetAt: EpochMs) {
        super('profile lookups are rate limited');
    }

    public override render(ctx: RenderContext): ReplyResponse {
        const when = `<t:${toEpochSeconds(this.resetAt)}:R>`;
        return { components: [new TextDisplayBuilder().setContent(ctx.t('profile-cooldown', { when }))] };
    }
}

@Gated(Cooldown('1m', { limit: 2, notice: ProfileCooldown }))
@UserContextMenuRoute('View Profile')
export class ViewProfile extends UserContextMenuHandler<'View Profile'> {
    public async execute(): Promise<void> {
        const { tag, createdAt } = this.target;

        const heading = this.t('profile.title', { tag });
        await this.reply(`### ${heading}\n${this.t('profile', { tag, joined: time(createdAt, 'R') })}`);
    }
}
