import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BUILD_STEPS } from '#commands/build/BuildRunner';
import { printBuildSummary } from '#commands/build/printBuildSummary';
import { StepPrinter } from '#core/output/StepPrinter';

import type { BuildResult } from '#commands/build/BuildRunner';
import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

let projectDir: string;

beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'seedcord-summary-'));
});

afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
});

async function summaryFor(packageJson?: Record<string, unknown>): Promise<string> {
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
        // justified: the summary reads only configFile from the config
        config: { configFile: join(projectDir, 'seedcord.config.ts') } as ResolvedSeedcordDevConfig,
        bundle: { modules: 7, textFiles: 4, bytes: 186_400, entry: join(projectDir, 'dist/index.mjs') }
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

    it('names the binary bot when package.json is missing or has no name', async () => {
        expect(await summaryFor()).toMatch(/--outfile bot\n/);
        expect(await summaryFor({ private: true })).toMatch(/--outfile bot\n/);
    });
});
