import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_GENERATED_DIR, MANIFEST_FILENAME, resolveGeneratedDir, resolveManifestPath } from '../src/constants';
import { TEMP_DIR } from './utils/constants';

const originalSeedcordDocsDir = process.env.SEEDCORD_DOCS_DIR;
const originalInitCwd = process.env.INIT_CWD;

describe('constants', () => {
    beforeEach(() => {
        delete process.env.SEEDCORD_DOCS_DIR;
        delete process.env.INIT_CWD;
    });

    afterEach(() => {
        if (originalSeedcordDocsDir) {
            process.env.SEEDCORD_DOCS_DIR = originalSeedcordDocsDir;
        } else {
            delete process.env.SEEDCORD_DOCS_DIR;
        }

        if (originalInitCwd) {
            process.env.INIT_CWD = originalInitCwd;
        } else {
            delete process.env.INIT_CWD;
        }
    });

    it('resolves generated dir from explicit root input', () => {
        const relative = './test-generated';
        const result = resolveGeneratedDir(relative);
        expect(path.isAbsolute(result)).toBe(true);
        expect(path.basename(result)).toBe('test-generated');
    });

    it('prefers environment override for generated dir', () => {
        const customDir = path.join(process.cwd(), 'env-generated');
        process.env.SEEDCORD_DOCS_DIR = customDir;
        expect(resolveGeneratedDir()).toBe(path.normalize(customDir));
    });

    it('falls back to default generated directory', () => {
        delete process.env.SEEDCORD_DOCS_DIR;
        expect(resolveGeneratedDir()).toBe(DEFAULT_GENERATED_DIR);
    });

    it('resolves manifest path relative to generated root when none provided', () => {
        const expected = path.join(path.normalize(TEMP_DIR), MANIFEST_FILENAME);
        expect(resolveManifestPath(TEMP_DIR)).toBe(expected);
    });

    it('respects explicit manifest path', () => {
        const explicit = path.join(process.cwd(), 'custom', 'manifest.json');
        expect(resolveManifestPath(undefined, explicit)).toBe(path.normalize(explicit));
    });
});
