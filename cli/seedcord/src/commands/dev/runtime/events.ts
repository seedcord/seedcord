import type { SeedcordFrameworkEvents } from '@seedcord/types/internal';

export type DevEvent =
    | { type: 'restart-required' }
    | { type: 'command-update-prompt'; files: string[] }
    | ({ type: 'server-port' } & SeedcordFrameworkEvents['seedcord:server-port'])
    | { type: 'progress'; status: string };

export type DevEventHandler = (event: DevEvent) => void;
