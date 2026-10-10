import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { RESTGetCurrentApplicationResult } from 'discord-api-types/v10';

export async function currentApplication(rest: Pick<REST, 'get'>): Promise<RESTGetCurrentApplicationResult> {
    // justified: the discord api contract for this route
    return (await rest.get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
}
