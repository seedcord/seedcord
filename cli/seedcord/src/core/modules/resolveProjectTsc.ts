import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

// a folder with no package.json resolves typescript from the CLI's own install
export function resolveProjectTsc(projectDir: string): string | null {
    const manifest = resolve(projectDir, 'package.json');
    const projectRequire = createRequire(existsSync(manifest) ? manifest : import.meta.url);

    // typescript 7's exports map leaves out bin/tsc
    let packageJson: string;
    try {
        packageJson = projectRequire.resolve('typescript/package.json');
    } catch {
        return null;
    }

    const tsc = join(dirname(packageJson), 'bin/tsc');
    return existsSync(tsc) ? tsc : null;
}
