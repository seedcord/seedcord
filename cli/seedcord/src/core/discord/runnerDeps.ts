import { ProjectLoader } from '#core/config/ProjectLoader';
import { restOf } from '#core/discord/restOf';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { startupShell } from '#src/core/ShellMode';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { REST } from '@discordjs/rest';
import type { SeedcordInstance } from '@seedcord/types/internal';

export type DiscordRest = Pick<REST, 'get' | 'put' | 'delete' | 'on' | 'off'>;

export interface RunnerDeps {
    readonly projectLoader: ProjectOpener;
    readonly openDiscord: (instance: SeedcordInstance) => DiscordRest;
}

export function defaultRunnerDeps(): RunnerDeps {
    return { projectLoader: new ProjectLoader(openModuleLoader, startupShell), openDiscord: restOf };
}
