import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';
import type { UUID } from 'node:crypto';

/** A ComponentsV2 top-level component, as discord.js accepts it in a message's `components` field. */
export interface V2Component {
    toJSON(): APIMessageTopLevelComponent;
}

/** Which roles, users, and mention kinds a reply may ping. */
interface ReplyAllowedMentions {
    readonly parse?: ('roles' | 'users' | 'everyone')[];
    readonly roles?: string[];
    readonly users?: string[];
    readonly repliedUser?: boolean;
}

/** A file as discord.js accepts it in a message's `files` field. */
interface ReplyFile {
    readonly attachment: Buffer | string;
    readonly name?: string;
    readonly description?: string;
}

/**
 * A ComponentsV2 reply. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`,
 * so a reply carries only `components` plus the v2-compatible `allowedMentions` and `files`.
 */
export interface ReplyResponse {
    /** The component tree the reply renders from. */
    readonly components: V2Component[];
    /** Which mentions written inside the components resolve into real pings. */
    readonly allowedMentions?: ReplyAllowedMentions;
    /** Attachments to upload. Under v2 each must be referenced by a thumbnail, media gallery, or file component, or it uploads hidden. */
    readonly files?: readonly ReplyFile[];
}

/**
 * Context passed into a denial's render. Built fresh per render so a reported fault's reply shows the same
 * uuid the framework logs and puts on the bus.
 */
export interface RenderContext {
    readonly uuid: UUID;
    /** Contact name a generic fault reply points the user to, from `notifications.developerUsername`. */
    readonly developerUsername?: string;
}
