import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { Guild, User } from 'discord.js';

/**
 * The context passed to a source loader. In a DM `guild` is `null` and `user` is still present.
 */
export interface PageContext {
    /** The interaction that triggered this load (a command or a nav click). */
    interaction: Repliables;
    /** The acting user, always present. */
    user: User;
    /** The guild, or `null` in a DM. */
    guild: Guild | null;
    /** The framework core. */
    core: Core;
}
