import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ApiDocsGenerator } from '@seedcord/docs-generator';

import { MOCK_PACKAGE_NAME, PACKAGES_DIR, TEMP_DIR } from './constants';

export async function setup(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }

    const generator = new ApiDocsGenerator({
        packagesDir: PACKAGES_DIR,
        outputDir: TEMP_DIR
    });

    console.log('Generating mock docs for integration tests...');
    await generator.run();

    const outputFile = resolve(TEMP_DIR, `${MOCK_PACKAGE_NAME}.json`);
    if (!existsSync(outputFile)) {
        throw new Error(`globalSetup: expected generated docs at ${outputFile}`);
    }
}

export async function teardown(): Promise<void> {
    if (existsSync(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true, force: true });
    }
}
