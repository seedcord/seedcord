import type { APIMessageTopLevelComponent, JSONEncodable } from 'discord.js';
import type { UUID } from 'node:crypto';

/**
 * A ComponentsV2 top-level component builder (text display, section, container, media gallery, file,
 * separator, or action row). Matches what discord.js accepts in a message's `components` field.
 */
export type V2Component = JSONEncodable<APIMessageTopLevelComponent>;

/**
 * What a reply renders into. A ComponentsV2 message built entirely from `components`. The framework never
 * emits classic content or embeds, a bot author who wants those sends them through discord.js directly.
 */
export interface ReplyResponse {
    components: V2Component[];
}

/**
 * Context threaded into a denial's render. Built fresh per render so a reported fault shows the same
 * uuid the framework logs and buses.
 */
export interface RenderContext {
    /** Tracking id for the render. For a reported fault it matches the bus payload's uuid. */
    uuid: UUID;
    /** Contact name a generic fault reply points the user to, from `notifications.developerUsername`. */
    developerUsername?: string;
}
