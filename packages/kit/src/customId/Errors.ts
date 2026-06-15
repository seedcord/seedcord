import { Denial } from '@denials/Denial';
import { DenialEmbed } from '@denials/DenialEmbed';

import type { ReplyResponse } from '@seedcord/types';

/**
 * Thrown when a customId was minted by an older version of its shape.
 *
 * This is normal after the shape changes. The reply tells the user to run the command again.
 */
export class StaleCustomId extends Denial {
    constructor(prefix: string) {
        super(`Stale customId for "${prefix}".`);
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
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
export class InvalidCustomId extends Denial {
    constructor(detail: string) {
        super(`Invalid customId. ${detail}`);
        this.report = true;
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed('Something went wrong. Please try again.');
        return { kind: 'embed', embeds: [embed.component] };
    }
}
