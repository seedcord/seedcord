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
    sharedModel?: string;
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
        expect(mock.entries.map((entry) => entry.subpath).sort()).toEqual([
            '.',
            './deep-entry',
            './deep/entry',
            './extra',
            './shared'
        ]);
    });

    // `./deep-entry` and `./deep/entry` collided on one filename before the hyphen got doubled
    it('names a nested subpath apart from a hyphenated one', () => {
        const names = mock.entries.map((entry) => basename(entry.output));
        expect(names).toContain('mock-docs.deep--entry.api.json');
        expect(names).toContain('mock-docs.deep-entry.api.json');
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

    // `./shared` slugs to the same name the shared model used before it moved off `.api.json`
    it('writes the shared model to a filename no entry point claims', () => {
        expect(mock.sharedModel).toBeDefined();
        expect(mock.entries.map((entry) => entry.output)).not.toContain(mock.sharedModel);
    });

    it('leaves a subpath slugged like the shared model holding its own surface', () => {
        const shared = mock.entries.find((entry) => entry.subpath === './shared')!;
        const model = readFileSync(resolve(TEMP_DIR, basename(shared.output)), 'utf8');
        expect(model).toContain('sharedOnlyFunction');
        expect(model).not.toContain('mockFunctionWithRest');
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
