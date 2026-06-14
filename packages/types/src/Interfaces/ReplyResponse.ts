import type { APIMessageTopLevelComponent, EmbedBuilder, JSONEncodable } from 'discord.js';
import type { UUID } from 'node:crypto';

/**
 * A ComponentsV2 top-level component builder (text display, section, container, media gallery, file,
 * separator, or action row). Matches what discord.js accepts in a message's `components` field.
 */
export type V2Component = JSONEncodable<APIMessageTopLevelComponent>;

/**
 * What a denial renders into. Either a classic embed reply or a ComponentsV2 reply. The two arms are
 * mutually exclusive because Discord rejects mixing embeds/content with ComponentsV2.
 */
export type ReplyResponse =
    | { kind: 'embed'; embeds: EmbedBuilder[]; content?: string }
    | { kind: 'v2'; components: V2Component[] };

/**
 * Context threaded into a denial's render. Built fresh per render so a reported fault shows the same
 * uuid the framework logs and buses.
 */
export interface RenderContext {
    /** Tracking id for the render. For a reported fault it matches the bus payload's uuid. */
    uuid: UUID;
}
