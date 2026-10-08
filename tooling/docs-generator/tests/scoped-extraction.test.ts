import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { ApiDocsGenerator } from '#src/ApiDocsGenerator';

import { PACKAGES_DIR } from './utils';

const MOCK_FULL_NAME = '@seedcord/mock-docs';
const silentLogger = { log: () => undefined };

describe('ApiDocsGenerator scoped extraction', () => {
    const scopedRun = async (packageName: string): Promise<ApiDocsGenerator> => {
        const outputDir = await mkdtempDisposable(resolve(tmpdir(), 'scoped-'));
        onTestFinished(() => outputDir.remove());
        return new ApiDocsGenerator({
            packagesDir: PACKAGES_DIR,
            outputDir: outputDir.path,
            packageName,
            logger: silentLogger
        });
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
