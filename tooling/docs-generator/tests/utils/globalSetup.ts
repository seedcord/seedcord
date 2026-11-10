import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { ApiDocsGenerator } from '#src/ApiDocsGenerator';

import { PACKAGES_DIR, MOCK_PACKAGE_NAME, TEMP_DIR } from '.';

const MOCK_DIR = resolve(PACKAGES_DIR, 'mock');
const MOCK_BASE_DIR = resolve(PACKAGES_DIR, 'mock-base');
const MOCK_BASE_LINK = resolve(MOCK_DIR, 'node_modules/@seedcord/fixture-base');

// API Extractor consumes built `.d.ts`, so emit the mock's declarations the same way the real
// packages do before extracting (the CI pipeline builds packages before `docs:extract`).
function buildDeclarations(packageDir: string): void {
    const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
    execFileSync(process.execPath, [tsc, '-p', resolve(packageDir, 'tsconfig.build.json')], { stdio: 'inherit' });
}

// the mock's workerd build imports mock-base by package name
async function linkMockBase(): Promise<void> {
    await rm(MOCK_BASE_LINK, { force: true });
    await mkdir(resolve(MOCK_BASE_LINK, '..'), { recursive: true });
    await symlink(MOCK_BASE_DIR, MOCK_BASE_LINK, 'dir');
}

export async function setup(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }

    buildDeclarations(MOCK_BASE_DIR);
    await linkMockBase();
    buildDeclarations(MOCK_DIR);

    const generator = new ApiDocsGenerator({
        packagesDir: PACKAGES_DIR,
        outputDir: TEMP_DIR
    });

    await generator.run();

    const outputFile = resolve(TEMP_DIR, `${MOCK_PACKAGE_NAME}.api.json`);
    if (!existsSync(outputFile)) {
        throw new Error(`globalSetup: expected generated docs at ${outputFile}`);
    }
}

export async function teardown(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }
    for (const leftover of [
        resolve(MOCK_DIR, 'dist'),
        resolve(MOCK_DIR, 'node_modules'),
        resolve(MOCK_BASE_DIR, 'dist')
    ]) {
        await rm(leftover, { recursive: true, force: true });
    }
}
