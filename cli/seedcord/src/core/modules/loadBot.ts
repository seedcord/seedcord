import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { importInstance } from '#core/modules/importInstance';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { SeedcordInstance } from '@seedcord/types/internal';

export const BOT_STEPS = ['read config', 'load plugins', 'load bot'] as const;
type BotStep = (typeof BOT_STEPS)[number];

interface LoadedBot {
    config: ResolvedSeedcordConfig;
    instance: SeedcordInstance;
}

// call this when you still need the open project after the bot loads
export function importBot(steps: Steps<BotStep>, { config, modules }: Project): Promise<SeedcordInstance> {
    printResolvedConfig(steps, config);
    return steps.step('load bot', () => importInstance(modules, config.instance));
}

export async function loadBot(steps: Steps<BotStep>, loader: ProjectOpener, projectDir: string): Promise<LoadedBot> {
    await using project = await openProjectWithSteps(steps, loader, { projectDir });
    return { config: project.config, instance: await importBot(steps, project) };
}
