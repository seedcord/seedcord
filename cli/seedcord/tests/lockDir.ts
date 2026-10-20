import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { onTestFinished } from 'vitest';

export function lockDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'seedcord-lock-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
}
