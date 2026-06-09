/** Type of HMR event. */
export type HmrEventType = 'create' | 'createDir' | 'update' | 'delete' | 'deleteDir';

/** Payload for an HMR update event. */
export interface HmrUpdateEvent {
    file: string;
    type: HmrEventType;
    /** Files affected by this update, such as importers. Only populated for `update` events. */
    affectedModules?: string[];
}

/** A module that processes hot updates. */
export interface HmrAware {
    /** Identifies the module in HMR logs. */
    readonly name: string;
    /** Called on an HMR update with the full event. */
    onHmr(event: HmrUpdateEvent): Promise<void>;
}

/**
 * HMR events the framework (client) sends to the CLI (server).
 *
 * @internal
 */
export interface SeedcordFrameworkEvents {
    'seedcord:register-critical-files': { patterns: string[] };
    'seedcord:commands-update-prompt': { files: string[] };
}

/**
 * HMR events the CLI (server) sends to the framework (client).
 *
 * @internal
 */
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrUpdateEvent;
    'seedcord:refresh-commands': { shouldRefresh: boolean };
}
