import { Notice } from '@seedcord/kit';
import { NoticeEmbed } from '@seedcord/kit/internal';

import type { ReplyResponse } from '@seedcord/types';

/**
 * Base for the catalog refusals. Renders the message as the bot's standard notice embed, so matching this
 * one type in the boundary restyles or translates every built-in gate refusal in one place. A refusal reply,
 * distinct from a {@link Silence} quiet drop.
 *
 * @example
 * ```ts
 * import { GateNotice } from 'seedcord';
 *
 * class NotPremium extends GateNotice {
 *     public constructor() {
 *         super('This command is for premium members only.');
 *     }
 * }
 *
 * // thrown from a custom gate's check, rendered as the standard notice embed
 * defineGate('Premium', (ctx) => {
 *     if (!isPremium(ctx.user)) throw new NotPremium();
 * });
 * ```
 */
export abstract class GateNotice extends Notice {
    public render(): ReplyResponse {
        return { kind: 'embed', embeds: [new NoticeEmbed(this.message).component] };
    }
}
