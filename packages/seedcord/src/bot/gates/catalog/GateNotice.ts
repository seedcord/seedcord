import { Notice } from '@seedcord/kit';
import { NoticeEmbed } from '@seedcord/kit/internal';

import type { ReplyResponse } from '@seedcord/types';

/**
 * Base for the catalog refusals. Renders the message as the bot's standard notice embed, so matching this
 * one type in the boundary restyles or translates every built-in gate refusal in one place.
 */
export abstract class GateNotice extends Notice {
    public render(): ReplyResponse {
        return { kind: 'embed', embeds: [new NoticeEmbed(this.message).component] };
    }
}
