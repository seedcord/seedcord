import { Notice } from './Notice';
import { NoticeEmbed } from './NoticeEmbed';

import type { RenderContext, ReplyResponse } from '@seedcord/types';

/**
 * A generic fault you throw after catching an error you do not have a specific message for.
 *
 * The user sees a fixed generic reply with the tracking uuid, never the cause. `report` defaults to
 * `true`, so the framework logs it and publishes it to the `handledException` bus. Pass `report: false`
 * to show the generic reply without the bus publish. The original error is stored as the standard
 * `cause`, so the real stack reaches the webhook. For a fault the user should see a real message,
 * subclass {@link Notice} and write your own `render` instead.
 *
 * The framework also renders this for an unhandled throw, where it points the user at
 * `ctx.developerUsername`.
 *
 * @example
 * ```ts
 * import { Fault } from '@seedcord/kit';
 *
 * try {
 *     await db.write(record);
 * } catch (cause) {
 *     // user sees the generic reply with the uuid, the real error rides along as cause for the webhook
 *     throw new Fault({ cause });
 *
 *     // pass report: false to show the same reply without publishing to the handledException bus
 *     // throw new Fault({ cause, report: false });
 * }
 * ```
 */
export class Fault extends Notice {
    public constructor(options?: { cause?: unknown; report?: boolean }) {
        super('A fault occurred', options?.cause === undefined ? undefined : { cause: options.cause });
        this.report = options?.report ?? true;
    }

    public render(ctx: RenderContext): ReplyResponse {
        const contact = ctx.developerUsername ?? 'the developer';
        const embed = new NoticeEmbed(
            `Something went wrong. Please reach out to ${contact} with a way to reproduce the error and the following:\n### UUID: \`${ctx.uuid}\``,
            'Error'
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}
