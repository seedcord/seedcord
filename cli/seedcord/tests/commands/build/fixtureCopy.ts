import { randomUUID } from 'node:crypto';
import { cp, readdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { onTestFinished } from 'vitest';

export const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');
export const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');

// the fixture's imports resolve only from inside this package
export async function copyFixture(fixture: string): Promise<string> {
    const projectDir = join(import.meta.dirname, '../../temp', `${basename(fixture)}-${randomUUID()}`);
    onTestFinished(() => rm(projectDir, { recursive: true, force: true }));
    await cp(fixture, projectDir, { recursive: true, filter: (source) => !source.endsWith('dist') });
    return projectDir;
}

export async function builtSource(outDir: string): Promise<string> {
    const files = await readdir(outDir, { recursive: true });
    const sources = files.filter((file) => /\.m?js$/u.test(file)).map((file) => readFile(join(outDir, file), 'utf8'));
    const contents = await Promise.all(sources);
    return contents.join('\n');
}
