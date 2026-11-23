import { HOST_CONTRACT, HostAugmentTarget, HostContract, HostPlugins, SeedcordBrand } from '@seedcord/types/internal';

import { Project } from '#core/project/Project';
import { emptyModuleGraph } from '#tests/emptyModuleGraph';
import { loadedConfig } from '#tests/loadedConfig';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';

export function modulesFrom(
    importModule: (entryPath: string) => Promise<unknown>,
    onDispose = (): void => undefined
): ModuleLoader & AsyncDisposable {
    // justified: importModule hands back whatever module the test built
    return {
        importModule,
        ...emptyModuleGraph,
        [Symbol.asyncDispose]: () => {
            onDispose();
            return Promise.resolve();
        }
    } as ModuleLoader & AsyncDisposable;
}

export function projectOpener(config: ResolvedSeedcordConfig, modules: ModuleLoader & AsyncDisposable): ProjectOpener {
    return {
        readConfig: () => Promise.resolve(loadedConfig(config)),
        openProject: (loaded) => Promise.resolve(new Project(loaded.config, loaded.files, modules))
    };
}

// the member list a real host builds at attach, one entry per dispatchMembers key
function claimedMembers(plugins: Record<string, object>): { key: string; member: string }[] {
    return Object.entries(plugins).flatMap(([key, plugin]) => {
        const members: unknown = Reflect.get(plugin, 'dispatchMembers');
        return typeof members === 'object' && members !== null
            ? Object.keys(members).map((member) => ({ key, member }))
            : [];
    });
}

// what a runner reads off a bot: brand keys, commands path, plugins
export function brandedInstance(commandsPath: string | null = null, plugins: Record<string, object> = {}): object {
    return {
        [SeedcordBrand]: true,
        [HostContract]: HOST_CONTRACT,
        [HostAugmentTarget]: '@seedcord/gateway',
        [HostPlugins]: {
            keys: Object.keys(plugins),
            members: claimedMembers(plugins),
            prepareCommands: () => Promise.resolve()
        },
        config: { bot: { commands: { path: commandsPath } } },
        ...plugins
    };
}
