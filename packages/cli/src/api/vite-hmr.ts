import type { HmrUpdateEvent } from './Hmr';

/**
 * Map of HMR events sent from the framework (client) to the CLI (server).
 *
 * @internal
 */
export interface SeedcordFrameworkEvents {
    'seedcord:register-critical-files': { patterns: string[] };
    'seedcord:commands-update-prompt': { files: string[] };
}

/**
 * Map of HMR events sent from the CLI (server) to the framework (client).
 *
 * @internal
 */
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrUpdateEvent;
    'seedcord:refresh-commands': { shouldRefresh: boolean };
}

declare module 'vite/types/customEvent.d.ts' {
    interface CustomEventMap extends SeedcordFrameworkEvents, SeedcordCliEvents {}
}
