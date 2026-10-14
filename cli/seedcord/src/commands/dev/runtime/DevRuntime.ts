import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { DevEventHandler } from './events';
import type { SeedcordInstance } from '@seedcord/types/internal';

export interface DevRuntimeContext {
    readonly config: ResolvedSeedcordConfig;
    readonly onEvent?: DevEventHandler;
}

export interface DevRuntime extends ModuleLoader {
    /** Called once before any other method. */
    start(context: DevRuntimeContext): Promise<void>;

    loadEntry(): Promise<DevRuntimeLoadResult>;

    /** Resolves with the bot's username once it started. */
    startBot(instance: SeedcordInstance): Promise<string | undefined>;

    /** Aborts a startup that is still running, shuts the bot down, then closes the runtime. Every method throws after this. */
    stopBot(): Promise<void>;

    /**
     * Relays the user's response to a pending command-update prompt to the running instance.
     * @param shouldRefresh - `true` re-registers the changed commands. `false` dismisses the prompt without re-registering.
     */
    refreshCommands(shouldRefresh: boolean): void;
}

export interface DevRuntimeLoadResult<TModule = unknown> {
    readonly module: TModule;
}
