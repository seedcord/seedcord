import * as path from 'node:path';

// WinstonFileSink writes only here. seedcord build and seedcord dev skip it
export function logsFolderIn(base: string): string {
    return path.join(base, 'logs');
}
