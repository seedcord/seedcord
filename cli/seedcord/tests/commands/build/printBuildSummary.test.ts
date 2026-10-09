import { mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { beforeEach, describe, expect, it } from 'vitest';

import { BUILD_STEPS } from '#commands/build/BuildRunner';
import { printBuildSummary } from '#commands/build/printBuildSummary';
import { StepPrinter } from '#core/output/StepPrinter';

import type { BuildResult } from '#commands/build/BuildRunner';
import type { ResolvedSeedcordDevConfig, ResolvedTarget } from '#core/config/schema';

let projectDir: string;

beforeEach(async () => {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-summary-'));
    projectDir = tmp.path;
    return () => tmp.remove();
});

async function summaryFor(
    packageJson?: Record<string, unknown>,
    outDir = 'dist',
    target: ResolvedTarget = { kind: 'server', entry: join(projectDir, 'src/index.ts') }
): Promise<string> {
    if (packageJson) await writeFile(join(projectDir, 'package.json'), JSON.stringify(packageJson));

    let written = '';
    const stdout = {
        isTTY: false,
        columns: 80,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        }
    };
    const printer = new StepPrinter({ command: 'build', labels: BUILD_STEPS, verbose: false, stdout, stderr: stdout });
    const result: BuildResult = {
        // justified: the summary reads only configFile and target from the config
        config: { configFile: join(projectDir, 'seedcord.config.ts'), target } as ResolvedSeedcordDevConfig,
        bundle: { modules: 7, textFiles: 4, bytes: 186_400, entry: join(projectDir, outDir, 'index.mjs') }
    };

    printBuildSummary(printer, result);
    return stripVTControlCharacters(written);
}

describe('printBuildSummary', () => {
    it('counts what was bundled and points at the entry', async () => {
        expect(await summaryFor({ name: 'my-bot' })).toContain('7 modules, 4 text files, 186.4 kB → ');
    });

    it('takes the binary name from package.json without its scope', async () => {
        expect(await summaryFor({ name: '@acme/my-bot' })).toMatch(/--outfile my-bot\n/);
    });

    it('quotes an entry path with a space so the printed commands paste into a shell', async () => {
        const summary = await summaryFor({ name: 'my-bot' }, 'build output');

        expect(summary).toMatch(/run {6}node '[^']* output\/index\.mjs'\n/);
        expect(summary).toMatch(/--compile '[^']* output\/index\.mjs' --outfile my-bot\n/);
    });

    it('keeps a $ and a quote literal in a posix shell', async () => {
        const summary = await summaryFor({ name: 'my-bot' }, "it's $cache");

        expect(summary).toMatch(/run {6}node '[^\n]*it'\\''s \$cache\/index\.mjs'\n/);
    });

    it('keeps a $ and a quote literal in powershell on windows', async () => {
        const platform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32' });
        try {
            const summary = await summaryFor({ name: 'my-bot' }, "it's $cache");

            expect(summary).toMatch(/run {6}node '[^\n]*it''s \$cache\/index\.mjs'\n/);
        } finally {
            if (platform) Object.defineProperty(process, 'platform', platform);
        }
    });

    it('ends an edge build with the command that deploys it', async () => {
        const target: ResolvedTarget = { kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') };

        const summary = await summaryFor({ name: 'my-bot' }, 'dist', target);

        expect(summary).toMatch(/\n {2}deploy {3}wrangler deploy\n/);
        expect(summary).not.toContain('--compile');
    });

    it('names the binary bot when package.json is missing or has no name', async () => {
        expect(await summaryFor()).toMatch(/--outfile bot\n/);
        expect(await summaryFor({ private: true })).toMatch(/--outfile bot\n/);
    });
});
