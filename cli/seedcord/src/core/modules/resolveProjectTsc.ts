import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// the project's own typescript first, then the copy the CLI ships with
export function resolveProjectTsc(projectDir: string): string | null {
    const manifest = resolve(projectDir, 'package.json');
    const projectRequire = createRequire(existsSync(manifest) ? manifest : import.meta.url);

    try {
        return projectRequire.resolve('typescript/bin/tsc');
    } catch {
        return null;
    }
}
