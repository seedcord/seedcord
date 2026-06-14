import { Denial, DenialEmbed } from '@interfaces/Components';

import type { RenderContext, ReplyResponse } from '@seedcord/types';

/**
 * Generic database operation error.
 *
 * A reported fault. The user sees the database message while the framework logs it and routes it to the
 * `handledException` bus with the threaded uuid.
 *
 * @internal
 */
export class DatabaseError extends Denial {
    /**
     * Creates a new DatabaseError.
     *
     * @param message - The error message describing what went wrong
     */
    constructor(message: string) {
        super(message);
        this.report = true;
    }

    render(ctx: RenderContext): ReplyResponse {
        const embed = new DenialEmbed(
            `An error occurred while interacting with the database.\n### UUID: \`${ctx.uuid}\``,
            'Database Error'
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}
