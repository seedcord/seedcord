import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { TEMP_DIR } from './utils';

interface ManifestEntry {
    subpath: string;
    output: string;
    sourceEntry?: string;
}
interface ManifestPackage {
    name: string;
    entries: ManifestEntry[];
}
interface Manifest {
    packages: ManifestPackage[];
}

const MOCK_FULL_NAME = '@seedcord/mock-docs';

describe('a package with more than one public entry point', () => {
    let mock: ManifestPackage;

    beforeAll(() => {
        const manifest = JSON.parse(readFileSync(resolve(TEMP_DIR, 'manifest.json'), 'utf8')) as Manifest;
        mock = manifest.packages.find((entry) => entry.name === MOCK_FULL_NAME)!;
    });

    it('documents the root and every public subpath', () => {
        expect(mock.entries.map((entry) => entry.subpath).sort()).toEqual(['.', './extra']);
    });

    it('skips a top-level and a nested internal subpath', () => {
        expect(mock.entries.some((entry) => entry.subpath.includes('internal'))).toBe(false);
    });

    it('writes one api model per entry', () => {
        for (const entry of mock.entries) {
            expect(existsSync(resolve(TEMP_DIR, basename(entry.output)))).toBe(true);
        }
        expect(new Set(mock.entries.map((entry) => entry.output)).size).toBe(mock.entries.length);
    });

    it('extracts a subpath model holding that subpath surface alone', () => {
        const extra = mock.entries.find((entry) => entry.subpath === './extra')!;
        const model = readFileSync(resolve(TEMP_DIR, basename(extra.output)), 'utf8');
        expect(model).toContain('extraFunction');
        // extra.ts re-exports mockFunction. mockFunctionWithRest stays behind on the root entry.
        expect(model).toContain('mockFunction');
        expect(model).not.toContain('mockFunctionWithRest');
    });
});
