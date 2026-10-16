import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { GuildSummary } from '@seedcord/core/internal';
import type { RESTGetAPICurrentUserGuildsResult } from 'discord-api-types/v10';

// discord returns at most 200 guilds a page
const GUILD_PAGE = 200;

export async function readBotGuilds(rest: Pick<REST, 'get'>): Promise<GuildSummary[]> {
    const guilds: GuildSummary[] = [];
    let after: string | undefined;
    let page: RESTGetAPICurrentUserGuildsResult;

    do {
        const query = new URLSearchParams({ limit: String(GUILD_PAGE) });
        if (after) query.set('after', after);

        // justified: the discord api contract for the current user's guilds route
        page = (await rest.get(Routes.userGuilds(), { query })) as RESTGetAPICurrentUserGuildsResult;
        for (const guild of page) guilds.push({ id: guild.id, name: guild.name });

        after = page.at(-1)?.id;
    } while (page.length === GUILD_PAGE && after);

    return guilds;
}
