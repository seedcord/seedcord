import { TextDisplayBuilder } from '@discordjs/builders';
import { Notice, SlashHandler, SlashRoute } from '@seedcord/gateway';
import { MessageFlags } from 'discord.js';

import type { ReplyResponse } from '@seedcord/gateway';

class ProbeNotice extends Notice {
    public constructor() {
        super('defer + notice probe');
        this.ephemeral = false;
    }

    public render(): ReplyResponse {
        return {
            components: [
                new TextDisplayBuilder().setContent(
                    'I am a Notice thrown after deferReply(). Watch whether the thinking message turns into this, or a new message appears and the thinking one is removed.'
                )
            ]
        };
    }
}

@SlashRoute('defernotice')
export class DeferNoticeProbe extends SlashHandler<'defernotice'> {
    public async execute(): Promise<void> {
        await this.event.deferReply({ flags: MessageFlags.Ephemeral });
        // await Promise.resolve();
        throw new ProbeNotice();
    }
}
