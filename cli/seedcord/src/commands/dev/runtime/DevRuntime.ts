import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { StateFolder } from '#core/state/StateFolder';
import type { DevEventHandler } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';

export interface DevRuntimeContext {
    readonly config: ResolvedSeedcordConfig;
    readonly files: ProjectFiles;
    readonly state: StateFolder;
    readonly onEvent?: DevEventHandler;
}

export interface DevRuntime extends ModuleLoader {
    start(context: DevRuntimeContext): Promise<void>;

    loadEntry(): Promise<DevRuntimeLoadResult>;

    startBot(instance: SeedcordInstance): Promise<string | undefined>;

    stop(): Promise<void>;

    // false dismisses the command-update prompt without registering anything
    refreshCommands(shouldRefresh: boolean): void;
}

export interface DevRuntimeLoadResult<TModule = unknown> {
    readonly module: TModule;
}
