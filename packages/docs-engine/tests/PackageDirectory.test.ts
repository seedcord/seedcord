import { beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PACKAGE_FULL_NAME } from './utils/constants';
import { getEngine, getMockPackage, getNodeBySlug } from './utils/test-helpers';

import type { PackageDirectory } from '@src/PackageDirectory';

let directory: PackageDirectory;

describe('PackageDirectory', () => {
    beforeAll(async () => {
        const pkg = await getMockPackage();
        directory = pkg.directory;
    });

    it('produces a snapshot of top-level entities', () => {
        const snapshot = directory.snapshot();
        expect(snapshot).toEqual({
            classes: ['base-class', 'mock-class'],
            interfaces: [
                'extended-interface',
                'indexable-interface',
                'mock-interface',
                'mock-object',
                'mock-recursive',
                'recursive-interface'
            ],
            enums: ['mock-enum'],
            types: [
                'mock-conditional',
                'mock-constrained',
                'mock-function-type',
                'mock-indexed',
                'mock-intersection',
                'mock-key-of',
                'mock-literal',
                'mock-mapped',
                'mock-partial',
                'mock-readonly',
                'mock-template',
                'mock-tuple',
                'mock-union'
            ],
            functions: ['async-mock-function', 'log-decorator', 'mock-function', 'mock-function-with-rest'],
            variables: ['mock-variable']
        });
    });

    it('matches engine entity snapshot results', async () => {
        const engine = await getEngine();
        const entities = engine.listPackageEntities(MOCK_PACKAGE_FULL_NAME);
        expect(entities).toEqual(directory.snapshot());
    });

    it('retrieves nodes by slug within an entity', () => {
        const node = directory.get('classes', 'mock-class');
        expect(node?.slug).toBe('mock-class');
        expect(node?.children.length).toBeGreaterThan(0);
    });

    it('returns sorted listings for each entity', () => {
        const functionNames = directory.listNames('functions');
        expect(functionNames).toEqual([
            'async-mock-function',
            'log-decorator',
            'mock-function',
            'mock-function-with-rest'
        ]);
    });

    it('exposes iterable entries', async () => {
        const entries = directory.entries('classes');
        expect(entries.some(([slug]) => slug === 'mock-class')).toBe(true);
        const [, node] = entries.find(([slug]) => slug === 'mock-class') ?? [];
        if (!node) {
            throw new Error('MockClass entry not found.');
        }
        const direct = await getNodeBySlug('mock-class');
        expect(node.id).toBe(direct.id);
    });
});
