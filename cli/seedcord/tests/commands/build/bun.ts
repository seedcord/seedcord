import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { smoke } from './smoke';

export function hasBun(): boolean {
    try {
        execFileSync('bun', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

export async function smokeBunBinary(kind: 'http' | 'gateway', botDir: string): Promise<string> {
    const elsewhere = await mkdtemp(join(tmpdir(), 'seedcord-bun-'));
    const binary = join(elsewhere, 'bot');

    try {
        // bun leaves a .bun-build temp file in cwd when a compile dies
        execFileSync('bun', ['build', '--compile', join(botDir, 'dist/index.mjs'), '--outfile', binary], {
            cwd: elsewhere,
            stdio: 'ignore'
        });
        return await smoke(kind, binary);
    } finally {
        await rm(elsewhere, { recursive: true, force: true });
    }
}
