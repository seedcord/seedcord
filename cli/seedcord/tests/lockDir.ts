import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface LockDir extends Disposable {
    readonly path: string;
}

export function lockDir(): LockDir {
    const path = mkdtempSync(join(tmpdir(), 'seedcord-lock-'));
    return { path, [Symbol.dispose]: () => rmSync(path, { recursive: true, force: true }) };
}
