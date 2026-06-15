import { Notice } from '@stops/Notice';
import { NoticeEmbed } from '@stops/NoticeEmbed';

import type { ReplyResponse } from '@seedcord/types';

/**
 * Thrown when a customId was minted by an older version of its shape.
 *
 * This is normal after the shape changes. The reply tells the user to run the command again.
 */
export class StaleCustomId extends Notice {
    constructor(prefix: string) {
        super(`Stale customId for "${prefix}".`);
    }

    render(): ReplyResponse {
        const embed = new NoticeEmbed(
            'This button or menu is from an older version. Please run the command again.',
            'Outdated'
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Thrown when a customId wire is corrupt or tampered with and cannot be trusted.
 *
 * This should not happen in normal use, so it reports.
 */
export class InvalidCustomId extends Notice {
    constructor(detail: string) {
        super(`Invalid customId. ${detail}`);
        this.report = true;
    }

    render(): ReplyResponse {
        const embed = new NoticeEmbed('Something went wrong. Please try again.');
        return { kind: 'embed', embeds: [embed.component] };
    }
}
