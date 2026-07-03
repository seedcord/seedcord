import { Notice } from '@seedcord/core';
import { NoticeCard } from '@seedcord/core/internal';

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
        const card = new NoticeCard(
            'This button or menu is from an older version. Please run the command again.',
            'Outdated'
        );
        return { components: [card.component] };
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
        const card = new NoticeCard('Something went wrong. Please try again.');
        return { components: [card.component] };
    }
}
