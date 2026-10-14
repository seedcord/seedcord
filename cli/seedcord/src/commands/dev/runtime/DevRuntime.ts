import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { DevEventHandler } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';

export interface DevRuntimeContext {
    readonly config: ResolvedSeedcordConfig;
    readonly onEvent?: DevEventHandler;
}

export interface DevRuntime extends ModuleLoader {
    start(context: DevRuntimeContext): Promise<void>;

    loadEntry(): Promise<DevRuntimeLoadResult>;

    startBot(instance: SeedcordInstance): Promise<string | undefined>;

    // shuts the bot down and closes the runtime
    stopBot(): Promise<void>;

    // false dismisses the command-update prompt without registering anything
    refreshCommands(shouldRefresh: boolean): void;
}

export interface DevRuntimeLoadResult<TModule = unknown> {
    readonly module: TModule;
}
