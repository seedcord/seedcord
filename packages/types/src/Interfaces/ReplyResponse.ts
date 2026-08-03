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

/**
 * Bytes to upload with a reply. A reply attaching only these files sends on either transport.
 *
 * @example
 * ```ts
 * await this.reply({
 *     components: [chart],
 *     files: [{ data: await renderChart(), name: 'chart.png', description: 'Sales by month' }]
 * });
 * ```
 */
export interface ReplyFile {
    /** The file's bytes. A node `Buffer` assigns here because it extends `Uint8Array`. */
    readonly data: Uint8Array;
    /**
     * The filename Discord shows, and the name an `attachment://` component reference resolves against.
     * Prefix it with `SPOILER_` to blur the attachment until the viewer clicks through.
     */
    readonly name: string;
    /** Alt text shown to screen readers and on hover. */
    readonly description?: string;
    /** A display title Discord shows in place of the filename. */
    readonly title?: string;
}

/**
 * A ComponentsV2 reply. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`,
 * so a reply carries only `components` plus the v2-compatible `allowedMentions` and `files`.
 *
 * @typeParam TNative - Extra file forms one transport accepts beyond {@link ReplyFile}. `@seedcord/gateway`
 * binds the discord.js file forms and exports that as `GatewayReplyResponse`. A reply built from
 * {@link ReplyFile} alone assigns to either transport.
 */
export interface ReplyResponse<TNative = never> {
    /** The component tree the reply renders from. */
    readonly components: V2Component[];
    /** Which mentions written inside the components resolve into real pings. */
    readonly allowedMentions?: ReplyAllowedMentions;
    /** Attachments to upload. Under v2 each must be referenced by a thumbnail, media gallery, or file component, or it uploads hidden. */
    readonly files?: readonly (ReplyFile | TNative)[];
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
