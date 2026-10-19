import { randomUUID } from 'node:crypto';
import { cp, readdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { onTestFinished } from 'vitest';

export const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');
export const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');
export const HTTP_BOT = join(import.meta.dirname, '../../fixtures/http-bot');

interface FixtureCopy extends AsyncDisposable {
    readonly path: string;
}

// the fixture's imports resolve only from inside this package
export async function fixtureCopy(fixture: string): Promise<FixtureCopy> {
    const path = join(import.meta.dirname, '../../temp', `${basename(fixture)}-${randomUUID()}`);
    const copy = { path, [Symbol.asyncDispose]: () => rm(path, { recursive: true, force: true }) };
    try {
        await cp(fixture, path, { recursive: true, filter: (source) => !source.endsWith('dist') });
    } catch (error: unknown) {
        await copy[Symbol.asyncDispose]();
        throw error;
    }
    return copy;
}

export async function copyFixture(fixture: string): Promise<string> {
    const copy = await fixtureCopy(fixture);
    onTestFinished(() => copy[Symbol.asyncDispose]());
    return copy.path;
}

export async function builtSource(outDir: string): Promise<string> {
    const files = await readdir(outDir, { recursive: true });
    const sources = files.filter((file) => /\.m?js$/u.test(file)).map((file) => readFile(join(outDir, file), 'utf8'));
    const contents = await Promise.all(sources);
    return contents.join('\n');
}
