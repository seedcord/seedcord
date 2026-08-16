import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, sep } from 'node:path';

import { ApiDocsGenerator } from '@seedcord/docs-generator';

import { MOCK_DIR, MOCK_PACKAGE_NAME, MOCK_SOURCE_DIR, PACKAGES_DIR, TEMP_DIR } from './constants';

// API Extractor consumes built `.d.ts`, so emit the mock's declarations before extracting.
function buildMockDeclarations(): void {
    const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
    execFileSync(process.execPath, [tsc, '-p', resolve(MOCK_DIR, 'tsconfig.build.json')], { stdio: 'inherit' });
}

// The docs-generator suite builds and deletes its own copy of this fixture. Sharing one directory
// made the two suites clobber each other's `dist` whenever they ran at the same time.
async function copyMockFixture(): Promise<void> {
    await rm(MOCK_DIR, { recursive: true, force: true });
    await cp(MOCK_SOURCE_DIR, MOCK_DIR, {
        recursive: true,
        filter: (source) => !source.endsWith(`${sep}dist`)
    });
}

export async function setup(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }

    await copyMockFixture();
    buildMockDeclarations();

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
    await rm(TEMP_DIR, { recursive: true, force: true });
    await rm(MOCK_DIR, { recursive: true, force: true });
}
