import { randomUUID } from 'node:crypto';
import { appendFile, cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { ShellMode } from '#core/viteMode';

import { quickBuildRunner } from './quickBuildRunner';

const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');
const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');

// the fixture's imports resolve only from inside this package
async function copyBot(fixture: string, entry: string, line: string): Promise<string> {
    const projectDir = join(import.meta.dirname, '../../temp', `${basename(fixture)}-${randomUUID()}`);
    onTestFinished(() => rm(projectDir, { recursive: true, force: true }));
    await cp(fixture, projectDir, { recursive: true, filter: (source) => !source.endsWith('dist') });
    await appendFile(join(projectDir, entry), `${line}\n`);
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
        const projectDir = await copyBot(FLAT_BOT, 'index.ts', 'console.log(`fixture:mode ${import.meta.env.MODE}`);');

        await quickBuildRunner(undefined, new ShellMode({ key: 'ENV', value: 'staging' })).run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain('fixture:mode staging');
    }, 120_000);

    it('reads VITE_ values from the .env beside the config when root is a subfolder', async () => {
        const line = 'console.log(`fixture:env ${import.meta.env.VITE_GREETING}`);';
        const projectDir = await copyBot(GATEWAY_BOT, 'src/index.ts', line);
        await writeFile(join(projectDir, '.env'), 'VITE_GREETING=hi from the project\n');

        await quickBuildRunner().run(projectDir);

        expect(await builtSource(join(projectDir, 'dist'))).toContain('fixture:env hi from the project');
    }, 120_000);
});
