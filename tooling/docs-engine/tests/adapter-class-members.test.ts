import { describe, expect, it } from 'vitest';

import { getMockPackage } from './utils/test-helpers';

import type { DocNode } from '#src/types';

async function topLevel(name: string): Promise<DocNode> {
    const pkg = await getMockPackage();
    const node = pkg.root.children.find((child) => child.name === name);
    if (!node) throw new Error(`${name} not found in the mock package`);
    return node;
}

const memberNames = (node: DocNode): string[] => node.children.map((child) => child.name).sort();

describe('class members', () => {
    it('documents only what the class declares, given an inline type-parameter constraint', async () => {
        expect(memberNames(await topLevel('InlineConstraintBase'))).toEqual(['stored']);
    });

    it('keeps a real inherited member and drops the keys of an inline type argument', async () => {
        expect(memberNames(await topLevel('InlineConstraintChild'))).toEqual(['ownProp', 'stored']);
    });

    it('keeps the declared property when a constraint key shadows its name', async () => {
        const node = await topLevel('InlineConstraintShadow');
        expect(memberNames(node)).toEqual(['token']);
        expect(node.children[0]?.headerText).toContain('TypeM');
    });

    it('drops the call, method, and construct signatures a constraint carries', async () => {
        expect(memberNames(await topLevel('InlineConstraintCallable'))).toEqual(['held']);
    });

    it('documents every property and method an interface declares', async () => {
        expect(memberNames(await topLevel('MockInterface'))).toEqual([
            'method',
            'nested',
            'optionalMethod',
            'optionalProp',
            'prop',
            'readonlyProp'
        ]);
    });
});
