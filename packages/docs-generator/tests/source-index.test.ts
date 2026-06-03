import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PACKAGES_DIR } from './utils/constants';
import { buildSourceIndex } from '../src/source-index';

const REPO_ROOT = path.resolve(PACKAGES_DIR, '../../..');
const MOCK_DIR = path.resolve(PACKAGES_DIR, 'mock');
const MOCK_CLASS = 'packages/docs-generator/tests/mock/class.ts';

function scan(githubBase = 'https://github.com/seedcord/seedcord'): ReturnType<typeof buildSourceIndex> {
    return buildSourceIndex({ packageDir: MOCK_DIR, repoRoot: REPO_ROOT, githubBase, ref: 'next', entry: 'index.ts' });
}

describe('buildSourceIndex', () => {
    it('records the exact src line and column of a top-level export', () => {
        const [source] = scan().sources.MockClass ?? [];
        expect(source).toEqual({
            file: MOCK_CLASS,
            line: 30,
            column: 14,
            url: `https://github.com/seedcord/seedcord/blob/next/${MOCK_CLASS}#L30C14`
        });
    });

    it('records a position per member, not the parent location', () => {
        const [computed] = scan().sources['MockClass.computedProp'] ?? [];
        expect(computed?.file).toBe(MOCK_CLASS);
        expect(computed?.line).toBe(116);
    });

    it('records the constructor under the `.constructor` key', () => {
        const [ctor] = scan().sources['MockClass.constructor'] ?? [];
        expect(ctor?.file).toBe(MOCK_CLASS);
        expect(ctor?.line).toBe(59);
    });

    it('records one entry per documented overload, excluding the implementation signature', () => {
        const overloads = scan().sources['MockClass.publicMethod'] ?? [];
        expect(overloads.map((entry) => entry.line)).toEqual([71, 76]);
    });

    it('omits the URL when no GitHub base is supplied but keeps line and column', () => {
        const [source] = scan('').sources.MockClass ?? [];
        expect(source?.url).toBeUndefined();
        expect(source?.line).toBe(30);
    });

    it('reports no re-exports for a standalone package', () => {
        expect(scan().reexports).toEqual([]);
    });
});
