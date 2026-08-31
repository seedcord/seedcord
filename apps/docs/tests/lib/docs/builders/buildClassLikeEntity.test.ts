import { describe, expect, it, vi } from 'vitest';

import type { BaseEntityModel, FormatContext } from '#lib/docs/types';
import type { DocNode } from '@seedcord/docs-engine';

// vitest cannot resolve the @lib/shiki import behind buildMemberSummary
vi.mock('../../../../src/lib/docs/builders/buildMemberSummary', () => ({
    buildMemberSummary: vi.fn((node: DocNode) => Promise.resolve({ label: node.name }))
}));
vi.mock('../../../../src/lib/docs/builders/buildTypeParameterSummaries', () => ({
    buildTypeParameterSummaries: vi.fn(() => Promise.resolve([]))
}));

const { buildClassLikeEntity } = await import('#lib/docs/builders/buildClassLikeEntity');

const context = {} as FormatContext;
const base = { kind: 'class' } as BaseEntityModel & { kind: 'class' };

function child(name: string, kindLabel: string, isInternal = false): DocNode {
    return { name, kindLabel, flags: { isInternal } } as unknown as DocNode;
}

function nodeWith(children: DocNode[]): DocNode {
    return { name: 'Owner', kindLabel: 'kind_class', flags: {}, children } as unknown as DocNode;
}

const labelsOf = (members: { label: string }[]): string[] => members.map((member) => member.label);

describe('buildClassLikeEntity', () => {
    it('sorts each child into the bucket its kind names', async () => {
        const model = await buildClassLikeEntity(
            base,
            nodeWith([
                child('prop', 'kind_property'),
                child('ctor', 'kind_constructor'),
                child('method', 'kind_method'),
                child('accessor', 'kind_accessor')
            ]),
            context
        );

        expect(labelsOf(model.properties)).toEqual(['prop', 'accessor']);
        expect(labelsOf(model.constructors)).toEqual(['ctor']);
        expect(labelsOf(model.methods)).toEqual(['method']);
    });

    it('drops an @internal child from every bucket', async () => {
        const model = await buildClassLikeEntity(
            base,
            nodeWith([
                child('shown', 'kind_property'),
                child('hidden', 'kind_property', true),
                child('hiddenMethod', 'kind_method', true)
            ]),
            context
        );

        expect(labelsOf(model.properties)).toEqual(['shown']);
        expect(model.methods).toEqual([]);
    });

    it('keeps declaration order inside a bucket', async () => {
        const model = await buildClassLikeEntity(
            base,
            nodeWith([
                child('second', 'kind_method'),
                child('unrelated', 'kind_property'),
                child('first', 'kind_method')
            ]),
            context
        );

        expect(labelsOf(model.methods)).toEqual(['second', 'first']);
    });

    it('leaves a kind it does not bucket out of the model', async () => {
        const model = await buildClassLikeEntity(base, nodeWith([child('nested', 'kind_class')]), context);

        expect([...model.properties, ...model.constructors, ...model.methods]).toEqual([]);
    });
});
