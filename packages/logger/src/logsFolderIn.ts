import * as path from 'node:path';

// WinstonFileSink's default folder. seedcord build and seedcord dev skip it
export function logsFolderIn(base: string): string {
    return path.join(base, 'logs');
}
