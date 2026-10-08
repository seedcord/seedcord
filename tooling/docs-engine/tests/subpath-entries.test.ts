import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { MOCK_DIR, MOCK_PACKAGE_FULL_NAME } from './utils/constants';
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
        expect(pkg.listed.listNames('interface')).toContain('promoted-shape');
    });

    it('keeps a symbol four entries export to a single node', () => {
        const variables = pkg.listed.listNames('variable').filter((slug) => slug.startsWith('mock-variable'));
        expect(variables).toEqual(['mock-variable']);

        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-variable');
        expect(node?.entries).toEqual(['.', './deep-entry', './deep/entry', './extra']);
    });

    it('records an overloaded symbol once per entry, not once per overload', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-function');
        expect(node?.signatures.length).toBeGreaterThan(1);
        expect(node?.entries).toEqual(['.', './extra']);
    });

    it('gives a runtime build its own node for a class it declares under a default-build name', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-runtime-host');
        const workerd = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-runtime-host-workerd');

        expect(node?.condition).toBeUndefined();
        expect(node?.children.map((child) => child.name)).toContain('listen');
        expect(workerd?.condition).toBe('workerd');
        expect(workerd?.entries).toEqual(['.']);
        expect(workerd?.children.map((child) => child.name)).toContain('fetch');
        expect(workerd?.children.map((child) => child.name)).not.toContain('listen');
        expect(workerd?.key).not.toBe(node?.key);
    });

    // a {@link Seedcord} in a doc comment resolves to the node class through this name
    it('keeps the bare qualified name on the default build class', () => {
        expect(engine.getNodeByQualifiedName(MOCK_PACKAGE_FULL_NAME, 'MockRuntimeHost')?.slug).toBe(
            'mock-runtime-host'
        );
        expect(engine.getNodeByQualifiedName(MOCK_PACKAGE_FULL_NAME, 'MockRuntimeHost@workerd')?.slug).toBe(
            'mock-runtime-host-workerd'
        );
        expect(engine.getNodeByQualifiedName(MOCK_PACKAGE_FULL_NAME, 'MockRuntimeHost@workerd.fetch')?.slug).toBe(
            'mock-runtime-host-workerd/fetch'
        );
    });

    it('lists what a runtime build class inherits from another package', () => {
        const workerd = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-runtime-host-workerd');
        const attach = workerd?.children.find((child) => child.name === 'attach');

        expect(attach?.inheritedFrom).toMatchObject({
            packageName: '@seedcord/fixture-base',
            qualifiedName: 'MockRemoteBase'
        });
    });

    it('links a runtime build class and its members to their own source', () => {
        const workerd = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-runtime-host-workerd');
        const fetch = workerd?.children.find((child) => child.name === 'fetch');

        expect(workerd?.sources[0]?.fileName).toMatch(/workerd\.index\.ts$/);
        expect(fetch?.sources[0]?.fileName).toMatch(/workerd\.index\.ts$/);
    });

    it('links an inherited member to its base class and leaves a same-named class alone', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-runtime-host');
        const fetch = node?.children.find((child) => child.name === 'fetch');

        expect(fetch?.inheritedFrom?.qualifiedName).toBe('MockRuntimeBase');
        expect(fetch?.sources[0]?.fileName).toMatch(/runtimeHost\.ts$/);
    });

    it('links an override the model reads as inherited to the override itself', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-runtime-host');
        const close = node?.children.find((child) => child.name === 'close');
        const lines = readFileSync(resolve(MOCK_DIR, 'runtimeHost.ts'), 'utf8').split('\n');
        const overrideLine = lines.findIndex((line) => line.includes('public override close')) + 1;

        expect(close?.inheritedFrom?.qualifiedName).toBe('MockRuntimeBase');
        expect(close?.sources[0]?.line).toBe(overrideLine);
    });

    it('records the root entry alone for a symbol no subpath re-exports', () => {
        const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-class');
        expect(node?.entries).toEqual(['.']);
    });
});
