import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { SourceIndexer } from '#src/SourceIndexer';

import { PACKAGES_DIR } from './utils/constants';

import type { SourceScan } from '#src/types';

const REPO_ROOT = path.resolve(PACKAGES_DIR, '../../..');
const MOCK_DIR = path.resolve(PACKAGES_DIR, 'mock');
const MOCK_CLASS = 'tooling/docs-generator/tests/mock/class.ts';

function scan(githubBase = 'https://github.com/seedcord/seedcord'): SourceScan {
    return SourceIndexer.scan({
        packageDir: MOCK_DIR,
        repoRoot: REPO_ROOT,
        githubBase,
        ref: 'next',
        entry: 'index.ts'
    });
}

describe('SourceIndexer', () => {
    let withBase: SourceScan;
    let withoutBase: SourceScan;

    beforeAll(() => {
        withBase = scan();
        withoutBase = scan('');
    }, 60_000);

    it('records the exact src line and column of a top-level export', () => {
        const [source] = withBase.sources.MockClass ?? [];
        expect(source).toEqual({
            file: MOCK_CLASS,
            line: 31,
            column: 14,
            url: `https://github.com/seedcord/seedcord/blob/next/${MOCK_CLASS}#L31C14`
        });
    });

    it('records a position per member, not the parent location', () => {
        const [computed] = withBase.sources['MockClass.computedProp'] ?? [];
        expect(computed?.file).toBe(MOCK_CLASS);
        expect(computed?.line).toBe(117);
    });

    it('records the constructor under the `.constructor` key', () => {
        const [ctor] = withBase.sources['MockClass.constructor'] ?? [];
        expect(ctor?.file).toBe(MOCK_CLASS);
        expect(ctor?.line).toBe(60);
    });

    it('records one entry per documented overload, excluding the implementation signature', () => {
        const overloads = withBase.sources['MockClass.publicMethod'] ?? [];
        expect(overloads.map((entry) => entry.line)).toEqual([72, 77]);
    });

    it('omits the URL when no GitHub base is supplied but keeps line and column', () => {
        const [source] = withoutBase.sources.MockClass ?? [];
        expect(source?.url).toBeUndefined();
        expect(source?.line).toBe(31);
    });

    it('reports no re-exports for a standalone package', () => {
        expect(withBase.reexports).toEqual([]);
    });
});
