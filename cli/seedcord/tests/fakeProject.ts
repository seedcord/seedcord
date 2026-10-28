import { HostAugmentTarget, HostPluginKeys, SeedcordBrand } from '@seedcord/types/internal';

import { Project } from '#core/project/Project';
import { loadedConfig } from '#tests/loadedConfig';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';

export function modulesFrom(importModule: (entryPath: string) => Promise<unknown>): ModuleLoader & AsyncDisposable {
    // justified: the runners read only importModule off the loader
    return { importModule, [Symbol.asyncDispose]: () => Promise.resolve() } as ModuleLoader & AsyncDisposable;
}

export function projectOpener(config: ResolvedSeedcordConfig, modules: ModuleLoader & AsyncDisposable): ProjectOpener {
    return {
        readConfig: () => Promise.resolve(loadedConfig(config)),
        openProject: (loaded) => Promise.resolve(new Project(loaded.config, loaded.files, modules))
    };
}

// the brand keys a runner reads off a bot, and its commands path
export function brandedInstance(commandsPath: string | null = null, pluginKeys: readonly string[] = []): object {
    return {
        [SeedcordBrand]: true,
        [HostAugmentTarget]: '@seedcord/gateway',
        [HostPluginKeys]: pluginKeys,
        config: { bot: { commands: { path: commandsPath } } }
    };
}
