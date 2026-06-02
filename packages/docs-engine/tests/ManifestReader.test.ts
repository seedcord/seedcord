import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ManifestReader } from '@src/ManifestReader';

import { TEMP_DIR } from './utils/constants';

describe('ManifestReader', () => {
    it('normalizes manifest data', async () => {
        const testDir = resolve(TEMP_DIR, 'manifest-reader');
        await mkdir(testDir, { recursive: true });
        const manifestPath = resolve(testDir, 'sample-manifest.json');

        const payload = {
            generatedAt: '2024-01-01T00:00:00.000Z',
            tool: 'api-extractor',
            apiExtractorVersion: '7.58.7',
            outputDir: './relative-output',
            repository: {
                url: 'https://example.com/repo.git',
                branch: 'main',
                commit: 'abcdef123456'
            },
            packages: [
                {
                    name: '@seedcord/mock-docs',
                    version: '1.2.3',
                    entryPoints: ['index.ts', ''],
                    output: './relative-output/mock-docs.json',
                    warnings: ['warn'],
                    errors: ['err'],
                    warningCount: 0,
                    errorCount: 2,
                    succeeded: true
                },
                {
                    name: '',
                    entryPoints: null
                }
            ]
        };

        await writeFile(manifestPath, JSON.stringify(payload), 'utf8');

        const reader = new ManifestReader({ manifestPath });
        const manifest = await reader.read();

        expect(manifest.generatedAt).toBe(payload.generatedAt);
        expect(manifest.tool).toBe('api-extractor');
        expect(manifest.apiExtractorVersion).toBe(payload.apiExtractorVersion);
        expect(manifest.outputDir).toBe(payload.outputDir);
        expect(manifest.repository).toEqual(payload.repository);

        expect(manifest.packages).toHaveLength(1);
        const [pkg] = manifest.packages;
        expect(pkg!.name).toBe('@seedcord/mock-docs');
        expect(pkg!.version).toBe('1.2.3');
        expect(pkg!.entryPoints).toEqual(['index.ts']);
        expect(pkg!.output).toBe('./relative-output/mock-docs.json');
        expect(pkg!.warningCount).toBe(0);
        expect(pkg!.errorCount).toBe(2);
        expect(pkg!.warnings).toEqual(['warn']);
        expect(pkg!.errors).toEqual(['err']);
        expect(pkg!.succeeded).toBe(true);
    });

    it('handles missing optional repository details', async () => {
        const testDir = resolve(TEMP_DIR, 'manifest-reader');
        await mkdir(testDir, { recursive: true });
        const manifestPath = resolve(testDir, 'minimal-manifest.json');

        const payload = {
            generatedAt: '',
            tool: '',
            apiExtractorVersion: '',
            outputDir: '',
            repository: {
                url: ''
            },
            packages: [
                {
                    name: '@seedcord/mock-docs',
                    version: '',
                    entryPoints: [],
                    warnings: [],
                    errors: [],
                    warningCount: 0,
                    errorCount: 0,
                    succeeded: false
                }
            ]
        };

        await writeFile(manifestPath, JSON.stringify(payload), 'utf8');

        const reader = new ManifestReader({ manifestPath });
        const manifest = await reader.read();

        expect(manifest.repository).toBeUndefined();
        expect(manifest.packages[0]?.output).toBeNull();
    });
});
