/** File-watcher event kinds carried by an {@link HmrUpdateEvent}. */
export type HmrEventType = 'create' | 'createDir' | 'update' | 'delete' | 'deleteDir';

/** A dev-mode file change the framework reloads from. */
export interface HmrUpdateEvent {
    file: string;
    type: HmrEventType;
    /** Files affected by this update, such as importers. Only populated for `update` events. */
    affectedModules?: string[];
    /** Whether a failed reload of this file rolls back to the last-good unit. Defaults to true. */
    rollback?: boolean;
}

/** A module that receives dev-mode hot updates through `onHmr`. */
export interface HmrAware {
    /** Names the module in HMR logs. */
    readonly name: string;
    onHmr(event: HmrUpdateEvent): Promise<void>;
}
