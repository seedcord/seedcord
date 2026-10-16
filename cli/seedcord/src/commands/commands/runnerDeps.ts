import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { restFromEnv } from '#core/discord/restFromEnv';
import { openModuleLoader } from '#core/modules/openModuleLoader';

import type { ShellMode } from '#core/viteMode';
import type { REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';

export type DiscordRest = Pick<REST, 'get' | 'put' | 'delete' | 'on' | 'off'>;

export interface RunnerDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly openDiscord: () => DiscordRest;
    readonly logger: ILogger;
}

export function defaultRunnerDeps(shell: ShellMode): RunnerDeps {
    return {
        projectLoader: new ProjectLoader(openModuleLoader, shell),
        openDiscord: restFromEnv,
        logger: cliLogger('Commands')
    };
}
