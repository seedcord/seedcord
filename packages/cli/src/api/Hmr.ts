/**
 * Interface for HMR handlers that can process hot updates for specific modules.
 */
export interface HmrHandler {
    /**
     * The name of the handler (e.g., 'Commands', 'Events').
     */
    name: string;

    /**
     * Determines if this handler should process the update for the given file.
     * @param file - The absolute path of the updated file.
     */
    accepts(file: string): boolean;

    /**
     * Handles the hot update.
     * @param file - The absolute path of the updated file.
     */
    handle(file: string): Promise<void> | void;
}

/**
 * Type of HMR event.
 */
export type HmrEventType = 'create' | 'createDir' | 'update' | 'delete' | 'deleteDir';

/**
 * Payload for the HMR update event.
 */
export interface HmrUpdateEvent {
    file: string;
    type: HmrEventType;
    /**
     * List of files that are affected by this update (e.g., importers).
     * Only populated for 'update' events.
     */
    affectedModules?: string[];
}

/**
 * Event name for Seedcord HMR updates.
 */
export const HMR_EVENT_NAME = 'seedcord:hmr';
