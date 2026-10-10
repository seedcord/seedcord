import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import type { REST } from '@discordjs/rest';
import type { RESTGetCurrentApplicationResult } from 'discord-api-types/v10';

export async function publicKeyOf(rest: Pick<REST, 'get'>): Promise<string> {
    const fromEnv = Envapter.get('DISCORD_PUBLIC_KEY');
    if (fromEnv !== undefined) return fromEnv;

    try {
        // justified: the discord api contract for this route
        const application = (await rest.get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
        return application.verify_key;
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.ConfigPublicKeyUnavailable, [asError(error).message], {
            cause: error
        });
    }
}
