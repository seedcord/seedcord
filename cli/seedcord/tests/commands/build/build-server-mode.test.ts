import { randomUUID } from 'node:crypto';
import { appendFile, cp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { ShellMode } from '#core/viteMode';

import { quickBuildRunner } from './quickBuildRunner';

const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');

// the fixture's imports resolve only from inside this package
async function copyFlatBot(): Promise<string> {
    const projectDir = join(import.meta.dirname, '../../temp', `flat-bot-${randomUUID()}`);
    onTestFinished(() => rm(projectDir, { recursive: true, force: true }));
    await cp(FLAT_BOT, projectDir, { recursive: true, filter: (source) => !source.endsWith('dist') });
    await appendFile(join(projectDir, 'index.ts'), 'console.log(`fixture:mode ${import.meta.env.MODE}`);\n');
    return projectDir;
}

async function builtSource(outDir: string): Promise<string> {
    const files = await readdir(outDir, { recursive: true });
    const sources = files.filter((file) => /\.m?js$/u.test(file)).map((file) => readFile(join(outDir, file), 'utf8'));
    const contents = await Promise.all(sources);
    return contents.join('\n');
}

describe('seedcord build mode on a node bot', () => {
    it('bundles in the mode the shell sets', async () => {
        const projectDir = await copyFlatBot();

        await quickBuildRunner(undefined, new ShellMode({ key: 'ENV', value: 'staging' })).run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain('fixture:mode staging');
    }, 120_000);
});
