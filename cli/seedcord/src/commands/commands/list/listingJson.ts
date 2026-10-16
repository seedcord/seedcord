import type { Listing } from './ListRunner';
import type { APIApplicationCommand } from 'discord-api-types/v10';

interface ListingJson {
    global: readonly APIApplicationCommand[];
    guilds: Record<string, readonly APIApplicationCommand[]>;
}

export function listingJson({ global, guilds }: Listing): ListingJson {
    return {
        global,
        guilds: Object.fromEntries(guilds.map((guild) => [guild.id, guild.commands]))
    };
}
