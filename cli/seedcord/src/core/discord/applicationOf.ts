import { currentApplication } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type { REST } from '@discordjs/rest';
import type { RESTGetCurrentApplicationResult } from 'discord-api-types/v10';

export async function applicationOf(rest: Pick<REST, 'get'>): Promise<RESTGetCurrentApplicationResult> {
    try {
        return await currentApplication(rest);
    } catch (error: unknown) {
        throw new SeedcordError(SeedcordErrorCode.CoreDiscordReadFailed, ['the application', asError(error).message], {
            cause: error
        });
    }
}
