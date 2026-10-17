import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { restFromEnv } from '#core/discord/restFromEnv';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { startupShell } from '#core/viteMode';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';

export type DiscordRest = Pick<REST, 'get' | 'put' | 'delete' | 'on' | 'off'>;

export interface RunnerDeps {
    readonly projectLoader: ProjectOpener;
    readonly openDiscord: () => DiscordRest;
    readonly logger: ILogger;
}

export function defaultRunnerDeps(): RunnerDeps {
    return {
        projectLoader: new ProjectLoader(openModuleLoader, startupShell),
        openDiscord: restFromEnv,
        logger: cliLogger('Commands')
    };
}
