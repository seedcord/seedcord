import { paint } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { Logger } from '@seedcord/logger';

export async function usernameOf(rest: Pick<REST, 'get'>, logger: Logger): Promise<string | undefined> {
    try {
        // justified: the @me payload carries username per the discord api contract
        const me = (await rest.get(Routes.user('@me'))) as { username?: string };
        if (me.username) logger.info(`Running as ${paint.sky.bold(me.username)}`);
        return me.username;
    } catch (caught) {
        // a bad token errors on the first real send anyway
        logger.warn('could not fetch the bot identity', caught);
        return undefined;
    }
}
