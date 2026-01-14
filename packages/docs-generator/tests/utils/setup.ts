import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll } from 'vitest';

import { ApiDocsGenerator } from '../../src/generator';

import { MOCK_PACKAGE_NAME, PACKAGES_DIR, readGeneratedDoc, TEMP_DIR } from '.';

import type { JSONOutput } from 'typedoc';

export let sharedDocs: JSONOutput.ProjectReflection;

beforeAll(async () => {
    // Prefer pre-generated docs created by globalSetup
    const outputFile = resolve(TEMP_DIR, `${MOCK_PACKAGE_NAME}.json`);
    if (existsSync(outputFile)) {
        sharedDocs = readGeneratedDoc(TEMP_DIR, MOCK_PACKAGE_NAME);
        return;
    }

    // if globalSetup didn't run for some reason, generate on-demand
    const generator = new ApiDocsGenerator({
        packagesDir: PACKAGES_DIR,
        outputDir: TEMP_DIR
    });

    await generator.run();
    sharedDocs = readGeneratedDoc(TEMP_DIR, MOCK_PACKAGE_NAME);
});
