import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { ApiDocsGenerator } from '@seedcord/docs-generator';

import { MOCK_PACKAGE_NAME, PACKAGES_DIR, TEMP_DIR } from './constants';

const MOCK_DIR = resolve(PACKAGES_DIR, 'mock');

// API Extractor consumes built `.d.ts`, so emit the mock's declarations before extracting.
function buildMockDeclarations(): void {
    const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
    execFileSync(process.execPath, [tsc, '-p', resolve(MOCK_DIR, 'tsconfig.build.json')], { stdio: 'inherit' });
}

export async function setup(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }

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
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }
    await rm(resolve(MOCK_DIR, 'dist'), { recursive: true, force: true });
}
