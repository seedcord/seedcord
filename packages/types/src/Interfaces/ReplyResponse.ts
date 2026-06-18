import type { APIMessageTopLevelComponent, BaseMessageOptions, JSONEncodable, MessageMentionOptions } from 'discord.js';
import type { UUID } from 'node:crypto';

/** A ComponentsV2 top-level component, as discord.js accepts it in a message's `components` field. */
export type V2Component = JSONEncodable<APIMessageTopLevelComponent>;

/** A file as discord.js accepts it in a message's `files` field. */
export type ReplyFile = NonNullable<BaseMessageOptions['files']>[number];

/**
 * A ComponentsV2 reply. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`,
 * so a reply carries only `components` plus the v2-compatible `allowedMentions` and `files`.
 */
export interface ReplyResponse {
    /** The component tree the reply renders from. */
    components: V2Component[];
    /** Which mentions written inside the components resolve into real pings. */
    allowedMentions?: MessageMentionOptions;
    /** Attachments to upload. Under v2 each must be referenced by a thumbnail, media gallery, or file component, or it uploads hidden. */
    files?: readonly ReplyFile[];
}

/**
 * Context passed into a denial's render. Built fresh per render so a reported fault's reply shows the same
 * uuid the framework logs and puts on the bus.
 */
export interface RenderContext {
    uuid: UUID;
    /** Contact name a generic fault reply points the user to, from `notifications.developerUsername`. */
    developerUsername?: string;
}
