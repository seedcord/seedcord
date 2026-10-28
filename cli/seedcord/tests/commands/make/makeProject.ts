import { mkdirSync, mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { onTestFinished } from 'vitest';

import { realPath } from '#core/project/realPath';

// a bot folder on disk, keyed by the path inside it
export function makeProject(files: Record<string, string>): string {
    const dir = mkdtempDisposableSync(join(tmpdir(), 'seedcord-make-'));
    onTestFinished(() => dir.remove());
    for (const [path, contents] of Object.entries(files)) {
        mkdirSync(dirname(join(dir.path, path)), { recursive: true });
        writeFileSync(join(dir.path, path), contents);
    }
    return realPath(dir.path);
}
