import { realpathSync } from 'node:fs';

// chokidar reports the real path, with symlinks and windows 8.3 short names resolved
export function watchedPath(path: string): string {
    return realpathSync.native(path);
}
