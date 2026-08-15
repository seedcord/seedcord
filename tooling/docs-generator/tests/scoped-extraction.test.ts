import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { ApiDocsGenerator } from '#src/generator';

import { PACKAGES_DIR } from './utils';

const MOCK_FULL_NAME = '@seedcord/mock-docs';
const silentLogger = { log: () => undefined };

describe('ApiDocsGenerator scoped extraction', () => {
    const tempDirs: string[] = [];

    afterAll(async () => {
        await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    });

    const scopedRun = async (packageName: string): Promise<ApiDocsGenerator> => {
        const outputDir = await mkdtemp(resolve(tmpdir(), 'scoped-'));
        tempDirs.push(outputDir);
        return new ApiDocsGenerator({ packagesDir: PACKAGES_DIR, outputDir, packageName, logger: silentLogger });
    };

    it('extracts only the named package by its full name', async () => {
        const generator = await scopedRun(MOCK_FULL_NAME);
        const result = await generator.run();
        expect(result.results).toHaveLength(1);
        expect(result.results[0]?.name).toBe(MOCK_FULL_NAME);
    });

    it('accepts the unscoped package name', async () => {
        const generator = await scopedRun('mock-docs');
        const result = await generator.run();
        expect(result.results).toHaveLength(1);
        expect(result.results[0]?.name).toBe(MOCK_FULL_NAME);
    });

    it('throws when --package matches no workspace package', async () => {
        const generator = await scopedRun('does-not-exist');
        await expect(generator.run()).rejects.toThrow(/matched no package/u);
    });
}, 60_000);
