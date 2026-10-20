import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import type { Tagged } from 'type-fest';

// chokidar and vite report every file path with its symlinks followed
export type RealPath = Tagged<string, 'RealPath'>;

function resolved(path: string): string {
    if (existsSync(path)) return realpathSync.native(path);
    const parent = dirname(path);
    // outDir or a listed folder can be missing. its parent still resolves
    return parent === path ? path : join(resolved(parent), basename(path));
}

export function realPath(path: string): RealPath {
    // justified: the only place a RealPath is made
    return resolved(path) as RealPath;
}
