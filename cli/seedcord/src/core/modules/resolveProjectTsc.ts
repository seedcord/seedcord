import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// a folder with no package.json resolves typescript from the CLI's own install
export function resolveProjectTsc(projectDir: string): string | null {
    const manifest = resolve(projectDir, 'package.json');
    const projectRequire = createRequire(existsSync(manifest) ? manifest : import.meta.url);

    try {
        return projectRequire.resolve('typescript/bin/tsc');
    } catch {
        return null;
    }
}
