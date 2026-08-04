import { beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PACKAGE_FULL_NAME } from './utils/constants';
import { getEngine, getNodeBySlug } from './utils/test-helpers';

import type { DocsEngine } from '@src/DocsEngine';
import type { DocNode } from '@src/types';

let engine: DocsEngine;

const child = (parent: DocNode, suffix: string): DocNode => {
    const match = parent.children.find((node) => node.slug === `${parent.slug}/${suffix}`);
    if (!match) {
        throw new Error(`Expected child ${suffix} under ${parent.slug}`);
    }
    return match;
};

// djb2-style tail (e.g. `checkPermissions-18o3wj0`). `overload-N` never matches: the only
// digit run is a single 1-based index after the final dash.
const HASH_GARBAGE = /-[a-z0-9]{6,}$/;

const TOP_LEVEL = ['mock-class', 'mock-interface', 'mock-enum', 'mock-function', 'mock-function-with-rest'];

describe('URL spec — engine signature fragments', () => {
    beforeAll(async () => {
        engine = await getEngine();
    });

    it('emits overload-N for a multi-signature function (no djb2 hash)', async () => {
        const fn = await getNodeBySlug('mock-function'); // 3 overloads
        expect(fn.signatures.map((signature) => signature.fragment)).toEqual([
            'overload-1',
            'overload-2',
            'overload-3'
        ]);
        for (const signature of fn.signatures) {
            expect(signature.anchor).toBe(signature.fragment); // bare, no parent slug or `#`
            expect(signature.fragment).not.toMatch(HASH_GARBAGE);
        }
    });

    it('emits an empty fragment for a single-signature function', async () => {
        const fn = await getNodeBySlug('mock-function-with-rest');
        expect(fn.signatures).toHaveLength(1);
        expect(fn.signatures[0]?.fragment).toBe('');
        expect(fn.signatures[0]?.anchor).toBe('');
    });

    it('emits overload-N for an overloaded method', async () => {
        const mockClass = await getNodeBySlug('mock-class');
        const method = child(mockClass, 'public-method'); // 2 overloads
        expect(method.signatures.map((signature) => signature.fragment)).toEqual(['overload-1', 'overload-2']);
    });

    it('gives a single-signature member (constructor) an empty fragment', async () => {
        const mockClass = await getNodeBySlug('mock-class');
        const ctor = child(mockClass, 'constructor');
        expect(ctor.signatures).toHaveLength(1);
        expect(ctor.signatures[0]?.fragment).toBe('');
    });

    it('derives every fragment purely from the overload index (stable across runs)', async () => {
        const fn = await getNodeBySlug('mock-function');
        const total = fn.signatures.length;
        for (const signature of fn.signatures) {
            const expected = total > 1 ? `overload-${signature.overloadIndex + 1}` : '';
            expect(signature.fragment).toBe(expected);
        }
    });

    it('never produces a slash or djb2 hash in any signature fragment', () => {
        const visit = (node: DocNode): void => {
            for (const signature of node.signatures) {
                expect(signature.fragment).not.toContain('/');
                expect(signature.fragment).not.toMatch(HASH_GARBAGE);
            }
            node.children.forEach(visit);
        };

        for (const slug of TOP_LEVEL) {
            const node = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, slug);
            if (node) visit(node);
        }
    });
});
