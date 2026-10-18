import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

// bun doesn't have findPackageJSON
export function installedManifest(name: string, fromDir: string): string | undefined {
    let dir = fromDir;
    let checked: string;
    do {
        const candidate = join(dir, 'node_modules', name, 'package.json');
        // pnpm stores a package's dependencies beside its real folder
        if (existsSync(candidate)) return realpathSync(candidate);

        checked = dir;
        dir = dirname(dir);
    } while (dir !== checked);

    return undefined;
}
