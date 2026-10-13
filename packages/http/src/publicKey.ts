import { currentApplication } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';

import type { REST } from '@discordjs/rest';

export async function publicKeyOf(rest: Pick<REST, 'get'>): Promise<string> {
    const fromEnv = Envapter.get('DISCORD_PUBLIC_KEY');
    if (fromEnv !== undefined) return fromEnv;

    try {
        const application = await currentApplication(rest);
        return application.verify_key;
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.ConfigPublicKeyUnavailable, [asError(error).message], {
            cause: error
        });
    }
}
