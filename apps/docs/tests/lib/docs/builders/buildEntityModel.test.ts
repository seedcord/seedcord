import { describe, expect, it, vi } from 'vitest';

import type { CodeRepresentation } from '#lib/docs/types';
import type { DocNode, VersionedDocsEngine } from '@seedcord/docs-engine';

// justified: the real modules pull in @lib/sanitizeHtml + @lib/shiki, which vitest can't resolve here.
vi.mock('../../../../src/lib/docs/comments/creators', () => ({
    createFormatContext: vi.fn(() => ({}))
}));
vi.mock('../../../../src/lib/docs/comments/formatter', () => ({
    formatCommentRich: vi.fn(() => Promise.resolve({ paragraphs: [], examples: [] }))
}));
vi.mock('../../../../src/lib/docs/builders/utils', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    resolveHeaderSignature: vi.fn(() => Promise.resolve({ text: '', html: null } satisfies CodeRepresentation))
}));

const { buildEntityModel } = await import('#lib/docs/builders/buildEntityModel');

const DOC_KIND_VARIABLE = 32;
const engine = {} as VersionedDocsEngine;

function makeNode(entries: string[] | undefined): DocNode {
    return {
        name: 'thing',
        slug: 'thing',
        qualifiedName: 'thing',
        packageName: '@seedcord/core',
        kind: DOC_KIND_VARIABLE,
        flags: {},
        signatures: [],
        children: [],
        comment: null,
        ...(entries && { entries })
    } as unknown as DocNode;
}

describe('buildEntityModel package badge', () => {
    it('names the subpath when only a subpath exports the symbol', async () => {
        const model = await buildEntityModel(engine, makeNode(['./hmr']));
        expect(model.displayPackage).toBe('core/hmr');
    });

    it('names the package alone when the root entry exports it too', async () => {
        const model = await buildEntityModel(engine, makeNode(['.', './plugin']));
        expect(model.displayPackage).toBe('core');
    });

    it('names the package alone when no entry is recorded', async () => {
        const model = await buildEntityModel(engine, makeNode(undefined));
        expect(model.displayPackage).toBe('core');
    });
});
