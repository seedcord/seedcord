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

/**
 * Interface for HMR handlers that can process hot updates for specific modules.
 */
export interface HmrAware {
    /**
     * Method that is called on HMR update and receives the full update event.
     */
    onHmr(event: HmrUpdateEvent): Promise<void>;
}
