import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { APIUser } from 'discord-api-types/v10';

/**
 * The context passed to a source loader. A loader that requires guild data fetches it through
 * `core.rest` because the raw payload has a guild id but doesn't have a guild object.
 */
export interface PageContext {
    /** The interaction that triggered this load (a command or a nav click). */
    interaction: Repliables;
    /** The acting user, always present. */
    user: APIUser;
    /** The guild id, or `null` in a DM. */
    guildId: string | null;
    core: Core;
}
