import type { Listing } from './ListRunner';
import type { APIApplicationCommand } from 'discord-api-types/v10';

interface SkippedJson {
    id: string;
    name: string;
    reason: string;
}

interface ListingJson {
    global: readonly APIApplicationCommand[];
    guilds: Record<string, readonly APIApplicationCommand[]>;
    skipped: SkippedJson[];
}

export function listingJson({ global, guilds, skipped }: Listing): ListingJson {
    return {
        global,
        guilds: Object.fromEntries(guilds.map((guild) => [guild.id, guild.commands])),
        skipped: skipped.map(({ guild, reason }) => ({ ...guild, reason }))
    };
}
