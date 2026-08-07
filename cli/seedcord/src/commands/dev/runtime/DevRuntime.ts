import type { DevEventHandler } from './events';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';

export interface DevRuntimeContext {
    readonly config: ResolvedSeedcordDevConfig;
    readonly onEvent?: DevEventHandler;
}

export interface DevRuntime {
    /** Called once before any other method. */
    start(context: DevRuntimeContext): Promise<void>;

    loadEntry(): Promise<DevRuntimeLoadResult>;

    /** Called when the dev session ends. */
    dispose(): Promise<void>;

    /**
     * Relays the user's response to a pending command-update prompt to the running instance.
     * @param shouldRefresh - `true` re-registers the changed commands. `false` dismisses the prompt without re-registering.
     */
    refreshCommands?(shouldRefresh: boolean): void;
}

export interface DevRuntimeLoadResult<TModule = unknown> {
    readonly module: TModule;
}
