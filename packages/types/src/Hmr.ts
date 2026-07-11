export type HmrEventType = 'create' | 'createDir' | 'update' | 'delete' | 'deleteDir';

export interface HmrUpdateEvent {
    file: string;
    type: HmrEventType;
    /** Files affected by this update, such as importers. Only populated for `update` events. */
    affectedModules?: string[];
    /** Whether a failed reload of this file rolls back to the last-good unit. Defaults to true. */
    rollback?: boolean;
}

export interface HmrAware {
    /** Names the module in HMR logs. */
    readonly name: string;
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

/**
 * A typed dev channel over a raw vite hot object, carrying the framework and CLI HMR wire so neither
 * side needs the ambient `vite-hmr.d.ts` augmentation.
 *
 * @internal
 */
export interface DevChannel<TSend, TRecv> {
    send<Key extends keyof TSend & string>(event: Key, data: TSend[Key]): void;
    on<Key extends keyof TRecv & string>(event: Key, cb: (data: TRecv[Key]) => void): void;
}
