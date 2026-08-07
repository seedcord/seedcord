import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { APIApplication } from 'discord-api-types/v10';

// a gateway host reads its id off the client session, this host has none so it fetches over REST
export async function fetchApplicationId(rest: REST): Promise<string> {
    try {
        // justified: the discord api contract for this route
        const application = (await rest.get(Routes.currentApplication())) as APIApplication;
        return application.id;
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable, { cause: error });
    }
}
