import type { ResolvedSeedcordDevConfig } from '@core/config/schema';

/**
 * Discriminated union of events that a DevRuntime can emit during its lifecycle.
 */
export type DevRuntimeEvent =
    | { type: 'module-loading'; path: string }
    | { type: 'module-loaded'; path: string }
    | { type: 'module-error'; path: string; error: unknown }
    | { type: 'file-change'; path: string }
    | { type: 'restart-required' }
    | { type: 'ready' }
    | { type: 'command-update-prompt'; files: string[] };

/**
 * Callback signature for runtime events.
 */
export type DevRuntimeEventHandler = (event: DevRuntimeEvent) => void;

/**
 * Context provided to a DevRuntime on initialization.
 */
export interface DevRuntimeContext {
    /**
     * Resolved configuration from seedcord.config.ts.
     */
    readonly config: ResolvedSeedcordDevConfig;

    /**
     * Optional event handler for lifecycle and file change events.
     */
    readonly onEvent?: DevRuntimeEventHandler;
}

/**
 * Interface for a development runtime.
 */
export interface DevRuntime {
    /**
     * Initialize the runtime with the provided context.
     * Called once before any other methods.
     */
    start(context: DevRuntimeContext): Promise<void>;

    /**
     * Load and return the entry module specified in the config.
     * This is typically the instance export that gets validated and started.
     */
    loadEntry(): Promise<DevRuntimeLoadResult>;

    /**
     * Clean up any resources held by the runtime.
     * Called when the dev session ends.
     */
    dispose(): Promise<void>;

    /**
     * Refreshes commands.
     */
    refreshCommands?(shouldRefresh: boolean): void;
}

/**
 * Result of loading an entry module.
 */
export interface DevRuntimeLoadResult<TModule = unknown> {
    /**
     * The loaded module export.
     */
    readonly module: TModule;

    /**
     * Optional metadata about the load operation.
     */
    readonly metadata?: {
        readonly loadTime?: number;
        readonly dependencies?: string[];
    };
}
