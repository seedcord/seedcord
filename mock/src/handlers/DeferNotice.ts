import { TextDisplayBuilder } from '@discordjs/builders';
import { Notice, SlashHandler, SlashRoute } from '@seedcord/gateway';

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
                    'I am a Notice thrown after defer(). Watch whether the thinking message turns into this, or a new message appears and the thinking one is removed.'
                )
            ]
        };
    }
}

@SlashRoute('defernotice')
export class DeferNoticeProbe extends SlashHandler<'defernotice'> {
    public async execute(): Promise<void> {
        await this.defer();
        throw new ProbeNotice();
    }
}
