import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, sep } from 'node:path';

import { ApiDocsGenerator } from '@seedcord/docs-generator';

import {
    MOCK_BASE_DIR,
    MOCK_BASE_SOURCE_DIR,
    MOCK_DIR,
    MOCK_PACKAGE_NAME,
    MOCK_SOURCE_DIR,
    PACKAGES_DIR,
    TEMP_DIR
} from './constants';

const MOCK_BASE_LINK = resolve(MOCK_DIR, 'node_modules/@seedcord/fixture-base');

// API Extractor consumes built `.d.ts`, so emit the mock's declarations before extracting.
function buildDeclarations(packageDir: string): void {
    const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
    execFileSync(process.execPath, [tsc, '-p', resolve(packageDir, 'tsconfig.build.json')], { stdio: 'inherit' });
}

// each suite gets its own copy. two suites sharing one `dist` overwrote each other's builds.
async function copyFixture(from: string, to: string): Promise<void> {
    await rm(to, { recursive: true, force: true });
    await cp(from, to, {
        recursive: true,
        filter: (source) => !source.endsWith(`${sep}dist`) && !source.endsWith(`${sep}node_modules`)
    });
}

// the mock's workerd build imports mock-base by package name
async function linkMockBase(): Promise<void> {
    await mkdir(resolve(MOCK_BASE_LINK, '..'), { recursive: true });
    await symlink(MOCK_BASE_DIR, MOCK_BASE_LINK, 'dir');
}

export async function setup(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }

    await copyFixture(MOCK_BASE_SOURCE_DIR, MOCK_BASE_DIR);
    await copyFixture(MOCK_SOURCE_DIR, MOCK_DIR);
    buildDeclarations(MOCK_BASE_DIR);
    await linkMockBase();
    buildDeclarations(MOCK_DIR);

    const generator = new ApiDocsGenerator({
        packagesDir: PACKAGES_DIR,
        outputDir: TEMP_DIR
    });

    console.log('Generating mock docs for integration tests...');
    await generator.run();

    const outputFile = resolve(TEMP_DIR, `${MOCK_PACKAGE_NAME}.api.json`);
    if (!existsSync(outputFile)) {
        throw new Error(`globalSetup: expected generated docs at ${outputFile}`);
    }
}

export async function teardown(): Promise<void> {
    for (const dir of [TEMP_DIR, MOCK_DIR, MOCK_BASE_DIR]) await rm(dir, { recursive: true, force: true });
}
