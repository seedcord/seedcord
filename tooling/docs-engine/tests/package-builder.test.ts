import { describe, expect, it } from 'vitest';

import { buildPackageFromModel } from '@builders/package-builder';
import { DocKind } from '@model/kinds';

import type { DocFlags, DocManifestPackage, DocNode } from '@src/types';

const flags: DocFlags = {
    access: null,
    accessor: null,
    isStatic: false,
    isAbstract: false,
    isConst: false,
    isReadonly: false,
    isOptional: false,
    isAsync: false,
    isDeprecated: false,
    isInherited: false,
    isDecorator: false,
    isInternal: false,
    isExternal: false,
    isOverwriting: false
};

let idCounter = 0;

function makeNode(over: Partial<DocNode> & Pick<DocNode, 'name' | 'kind' | 'isExported'>): DocNode {
    const name = over.name;
    return {
        id: idCounter++,
        key: `mock!${name}`,
        packageName: '@seedcord/mock',
        sourcePackage: { name: '@seedcord/mock', version: '0.0.0' },
        path: [name],
        qualifiedName: name,
        slug: name.toLowerCase(),
        kindLabel: 'kind',
        flags,
        typeParameters: [],
        signatures: [],
        children: [],
        groups: [],
        sources: [],
        inheritance: { extends: [], implements: [], extendedBy: [], implementedBy: [] },
        ...over
    };
}

const manifest: DocManifestPackage = {
    name: '@seedcord/mock',
    version: '0.0.0',
    entryPoints: ['index.d.ts'],
    output: null,
    warnings: [],
    errors: [],
    warningCount: 0,
    errorCount: 0,
    succeeded: true
};

// The adapter sets a forgotten interface's PropertySignature children isExported:true even though the
// interface itself is forgotten (isExported:false). This is the ConfirmIds shape.
function buildTree(): DocNode {
    const shown = makeNode({ name: 'shown', kind: DocKind.Property, isExported: true });
    const publicOptions = makeNode({
        name: 'PublicOptions',
        kind: DocKind.Interface,
        isExported: true,
        children: [shown]
    });

    const secret = makeNode({ name: 'secret', kind: DocKind.Property, isExported: true });
    const hiddenIds = makeNode({
        name: 'HiddenIds',
        kind: DocKind.Interface,
        isExported: false,
        children: [secret]
    });

    const internalProp = makeNode({ name: 'internalProp', kind: DocKind.Property, isExported: true });
    const internalInterface = makeNode({
        name: 'InternalInterface',
        kind: DocKind.Interface,
        isExported: true,
        flags: { ...flags, isInternal: true },
        children: [internalProp]
    });

    return makeNode({
        name: 'root',
        kind: DocKind.Project,
        isExported: true,
        children: [publicOptions, hiddenIds, internalInterface]
    });
}

describe('buildPackageFromModel search gate', () => {
    it('keeps an exported interface and its properties in search', () => {
        const { indexes } = buildPackageFromModel(manifest, buildTree());
        const names = indexes.search.map((entry) => entry.name);
        expect(names).toContain('PublicOptions');
        expect(names).toContain('shown');
    });

    it('drops a forgotten interface and its properties from search and the sidebar', () => {
        const { indexes } = buildPackageFromModel(manifest, buildTree());
        const searchNames = indexes.search.map((entry) => entry.name);
        expect(searchNames).not.toContain('HiddenIds');
        expect(searchNames).not.toContain('secret');

        const interfaceSlugs = (indexes.byKind.get(DocKind.Interface) ?? []).map((node) => node.slug);
        expect(interfaceSlugs).not.toContain('hiddenids');
        const propertySlugs = (indexes.byKind.get(DocKind.Property) ?? []).map((node) => node.slug);
        expect(propertySlugs).not.toContain('secret');
    });

    it('keeps a forgotten node and its children resolvable as link targets', () => {
        const { indexes } = buildPackageFromModel(manifest, buildTree());
        expect(indexes.bySlug.has('hiddenids')).toBe(true);
        expect(indexes.bySlug.has('secret')).toBe(true);
        expect(indexes.byQName.has('HiddenIds')).toBe(true);
    });

    it('drops an @internal node and its children from search and the sidebar but keeps them resolvable', () => {
        const { indexes } = buildPackageFromModel(manifest, buildTree());
        const searchNames = indexes.search.map((entry) => entry.name);
        expect(searchNames).not.toContain('InternalInterface');
        expect(searchNames).not.toContain('internalProp');

        const interfaceSlugs = (indexes.byKind.get(DocKind.Interface) ?? []).map((node) => node.slug);
        expect(interfaceSlugs).not.toContain('internalinterface');

        expect(indexes.bySlug.has('internalinterface')).toBe(true);
        expect(indexes.byQName.has('InternalInterface')).toBe(true);
    });
});
