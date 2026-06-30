/** Type of HMR event. */
export type HmrEventType = 'create' | 'createDir' | 'update' | 'delete' | 'deleteDir';

/** Payload for an HMR update event. */
export interface HmrUpdateEvent {
    file: string;
    type: HmrEventType;
    /** Files affected by this update, such as importers. Only populated for `update` events. */
    affectedModules?: string[];
    /** Whether a failed reload of this file rolls back to the last-good unit. Defaults to true. */
    rollback?: boolean;
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

// the minimal raw-hot shape, satisfied by both vite's `import.meta.hot` and the CLI's `NormalizedHotChannel`.
// vite types our `seedcord:*` payloads as `any` (they sit outside its CustomEventMap), so the typed
// DevChannel above is the real contract callers see.
interface RawHot {
    send(event: string, data?: unknown): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors vite's own InferCustomEventPayload fallback
    on(event: string, cb: (data: any) => void): void;
}

/**
 * Wraps a raw vite hot object as a typed {@link DevChannel}.
 *
 * @internal
 */
export function wrapHot<TSend, TRecv>(hot: RawHot): DevChannel<TSend, TRecv> {
    return {
        send: (event, data) => hot.send(event, data),
        on: (event, cb) => hot.on(event, cb)
    };
}
