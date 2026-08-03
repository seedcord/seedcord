import type { ReplyResponse } from '@seedcord/types';
import type { BaseMessageOptions } from 'discord.js';

/**
 * Every file form discord.js accepts in a message's `files` field: `AttachmentBuilder`, `Attachment`, a
 * `Buffer`, a node `Stream`, a path or URL string, and an `{ attachment, name }` payload.
 */
export type GatewayFile = NonNullable<BaseMessageOptions['files']>[number];

/**
 * A reply that may attach files in any form discord.js accepts, on top of the portable `ReplyFile`. The
 * reply verbs already take this, so name it only to type a variable or a helper's return. A `Notice`
 * render or a paginator page returns the plain `ReplyResponse`, which takes a `ReplyFile` alone.
 *
 * @example
 * ```ts
 * // any discord.js file form
 * await this.reply({
 *     components: [container],
 *     files: [new AttachmentBuilder(createReadStream('./report.pdf'), { name: 'report.pdf' })]
 * });
 * ```
 */
export type GatewayReplyResponse = ReplyResponse<GatewayFile>;
