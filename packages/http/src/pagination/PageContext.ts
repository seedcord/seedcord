import type { Core } from '@interfaces/Core';
import type { Repliables } from '@src/handlers/interactionTypes';
import type { APIUser } from 'discord-api-types/v10';

/**
 * The context passed to a source loader. The raw payload carries a guild id with no guild object, so a
 * loader that requires guild data fetches it through `core.rest`.
 */
export interface PageContext {
    /** The interaction that triggered this load (a command or a nav click). */
    interaction: Repliables;
    /** The acting user, always present. */
    user: APIUser;
    /** The guild id, or `null` in a DM. */
    guildId: string | null;
    /** The framework core. */
    core?: Core;
}
