import { beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PACKAGE_FULL_NAME } from './utils/constants';
import { getEngine, getMockPackage } from './utils/test-helpers';

import type { DocsEngine } from '#src/DocsEngine';
import type { DocPackageModel } from '#src/types';

let engine: DocsEngine;
let pkg: DocPackageModel;

describe('subpath entry points', () => {
    beforeAll(async () => {
        engine = await getEngine();
        pkg = await getMockPackage();
    });

    it('documents a symbol only the subpath exports', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'extra-function');
        expect(node).not.toBeNull();
        expect(node?.entries).toEqual(['./extra']);
    });

    // the page badge renders `entries` as the import path a reader types
    it('claims no entry for a symbol the subpath references without exporting', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'extra-only');
        expect(node?.isExported).toBe(false);
        expect(node?.entries).toBeUndefined();
    });

    // the root model carries PromotedShape as a forgotten declaration, and `./extra` exports it
    it('promotes a forgotten root node when a subpath exports the same symbol', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'promoted-shape');
        expect(node?.isExported).toBe(true);
        expect(node?.entries).toEqual(['./extra']);
        expect(pkg.directory.listNames('interfaces')).toContain('promoted-shape');
    });

    it('keeps a symbol four entries export to a single node', () => {
        const variables = pkg.directory.listNames('variables').filter((slug) => slug.startsWith('mock-variable'));
        expect(variables).toEqual(['mock-variable']);

        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-variable');
        expect(node?.entries).toEqual(['.', './deep-entry', './deep/entry', './extra']);
    });

    it('records an overloaded symbol once per entry, not once per overload', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-function');
        expect(node?.signatures.length).toBeGreaterThan(1);
        expect(node?.entries).toEqual(['.', './extra']);
    });

    it('records the root entry alone for a symbol no subpath re-exports', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-class');
        expect(node?.entries).toEqual(['.']);
    });
});
