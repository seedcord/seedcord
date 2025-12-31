import 'vite';
import type { HmrUpdateEvent } from './Hmr';

/**
 * Map of HMR events sent from the framework (client) to the CLI (server).
 */
export interface SeedcordFrameworkEvents {
    'seedcord:register-critical-files': { patterns: string[] };
    'seedcord:commands-update-prompt': { file: string };
}

/**
 * Map of HMR events sent from the CLI (server) to the framework (client).
 */
export interface SeedcordCliEvents {
    'seedcord:hmr': HmrUpdateEvent;
    'seedcord:refresh-commands': {};
}

declare module 'vite/types/customEvent.d.ts' {
    interface CustomEventMap extends SeedcordFrameworkEvents, SeedcordCliEvents {}
}
