import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ApiAdapter } from '#model/adapter';
import { createApiModel, loadApiPackage } from '#model/load-model';

import { MOCK_PACKAGE_NAME, TEMP_DIR } from './utils/constants';

import type { DocManifestPackage, DocNode, InlineTagTarget } from '#src/types';

type LinkTarget = number | string | InlineTagTarget | undefined;

// A re-exported foreign symbol has no ApiItem in this package's model (no bundledPackages), so
// resolveDeclarationReference can't resolve a {@link} to it. The adapter must fall back to the
// package's re-export table, the same owner data the type-excerpt path uses to cross-package link.
function transformMock(reexports: DocManifestPackage['reexports']): DocNode {
    const model = createApiModel();
    const pkg = loadApiPackage(model, resolve(TEMP_DIR, `${MOCK_PACKAGE_NAME}.api.json`));
    const manifest: DocManifestPackage = {
        name: '@seedcord/mock-docs',
        version: '0.0.0',
        entryPoints: ['index.d.ts'],
        output: null,
        warnings: [],
        errors: [],
        warningCount: 0,
        errorCount: 0,
        succeeded: true,
        ...(reexports && { reexports })
    };
    return new ApiAdapter(manifest, model).transform(pkg);
}

function seeLinkTarget(node: DocNode, text: string): LinkTarget {
    const part = (node.comment?.blockTags ?? [])
        .filter((tag) => tag.tag === '@see')
        .flatMap((tag) => tag.content)
        .find((p) => p.kind === 'inline-tag' && p.tag === '@link' && p.text === text);
    return part?.kind === 'inline-tag' ? part.target : undefined;
}

const mockClassOf = (root: DocNode): DocNode => {
    const node = root.children.find((child) => child.name === 'MockClass');
    if (!node) throw new Error('MockClass not found in transformed model');
    return node;
};

describe('ApiAdapter @link resolution for re-exported symbols', () => {
    it('resolves a {@link} to a re-exported foreign symbol through the package re-export table', () => {
        const root = transformMock([{ name: 'ReexportedForeign', owner: '@seedcord/other' }]);
        const target = seeLinkTarget(mockClassOf(root), 'ReexportedForeign');
        expect(typeof target === 'object' ? target : undefined).toMatchObject({
            packageName: '@seedcord/other',
            qualifiedName: 'ReexportedForeign'
        });
    });

    it('leaves a {@link} to a name the package does not re-export unresolved', () => {
        const root = transformMock([]);
        expect(seeLinkTarget(mockClassOf(root), 'ReexportedForeign')).toBeUndefined();
    });
});
