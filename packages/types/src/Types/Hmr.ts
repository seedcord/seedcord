/** File-watcher event kinds used by an {@link HmrUpdateEvent}. */
export type HmrEventType = 'create' | 'createDir' | 'update' | 'delete' | 'deleteDir';

/** A dev-mode file change the framework reloads from. */
export interface HmrUpdateEvent {
    file: string;
    type: HmrEventType;
    /** The file and every file that imports it. Folder events leave it out. */
    affectedModules?: string[];
    /** Whether a failed reload of this file rolls back to the last-good unit. Defaults to true. */
    rollback?: boolean;
}

/** A module that receives dev-mode hot updates through `onHmr`. */
export interface HmrAware {
    onHmr(event: HmrUpdateEvent): Promise<void>;
}
