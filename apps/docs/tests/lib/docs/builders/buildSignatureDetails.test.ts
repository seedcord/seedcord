import { describe, expect, it, vi } from 'vitest';

import type { CodeRepresentation, CommentParagraph, FormatContext, FormattedComment } from '@lib/docs/types';
import type { DocNode, DocSignature } from '@seedcord/docs-engine';

// justified: formatting.ts pulls in @lib/sanitizeHtml + @lib/shiki, which vitest can't resolve without vite-tsconfig-paths.
vi.mock('../../../../src/lib/docs/formatting', () => {
    const code = (text: string): CodeRepresentation => ({ text, html: null });
    return {
        formatDeclarationHeader: vi.fn((header: { text: string }) => Promise.resolve(code(header.text))),
        formatSignature: vi.fn((rendered: { text: string }) => Promise.resolve(code(rendered.text))),
        highlightCode: vi.fn((text: string) => Promise.resolve(code(text)))
    };
});
// param/throws-free signatures never call formatCommentRich, so stub the module to keep its shiki imports out.
vi.mock('../../../../src/lib/docs/comments/formatter', () => ({
    formatCommentRich: vi.fn(() => Promise.resolve({ paragraphs: [], examples: [] }))
}));
// renderInlineValue pulls in sanitizeHtml (unresolvable here), stub it to echo the markdown.
vi.mock('../../../../src/lib/docs/comments/renderers/renderInlineValue', () => ({
    renderInlineValue: vi.fn((markdown: string) => Promise.resolve([{ plain: markdown, html: markdown }]))
}));

const { buildSignatureDetails } = await import('@lib/docs/builders/buildSignatureDetails');

const para = (plain: string): CommentParagraph => ({ plain, html: plain });
const comment = (paragraphs: CommentParagraph[]): FormattedComment => ({ paragraphs, examples: [] });
const context = {} as FormatContext;

function makeSig(name: string): DocSignature {
    return {
        name,
        render: { text: name },
        parameters: [],
        typeParameters: [],
        flags: {}
    } as unknown as DocSignature;
}

function makeNode(): DocNode {
    return {
        name: 'int',
        slug: 'int',
        id: 1,
        signatures: [makeSig('int(name)'), makeSig('int(name, min, max)')],
        flags: {},
        comment: undefined
    } as unknown as DocNode;
}

describe('buildSignatureDetails', () => {
    it('keeps each overload lead in its own description, separate from the documentation below the signature', async () => {
        const result = await buildSignatureDetails({
            node: makeNode(),
            context,
            signatureComments: [comment([para('unbounded')]), comment([para('bounded')])],
            description: null,
            descriptionSignatureIndex: null,
            headerSignature: { text: 'int', html: null }
        });

        expect(result[0]?.description).toEqual([para('unbounded')]);
        expect(result[1]?.description).toEqual([para('bounded')]);
        // the lead must not leak into documentation, which is reserved for the @param/@throws prose below the signature
        expect(result[0]?.documentation).toEqual([]);
        expect(result[1]?.documentation).toEqual([]);
    });

    it('renders a param {@default} value inline in the Parameter header', async () => {
        const sig = makeSig('fn(retries)');
        (sig as unknown as { parameters: unknown[] }).parameters = [
            { id: 0, name: 'retries', kind: 0, defaultValue: '`5`', comment: { summary: 'retry count' }, flags: {} }
        ];
        const node = {
            name: 'fn',
            slug: 'fn',
            id: 2,
            signatures: [sig],
            flags: {},
            comment: undefined
        } as unknown as DocNode;

        const result = await buildSignatureDetails({
            node,
            context,
            signatureComments: [comment([])],
            description: null,
            descriptionSignatureIndex: null,
            headerSignature: { text: 'fn', html: null }
        });

        const header = result[0]?.documentation.find((p) => p.plain.startsWith('Parameter: retries'));
        expect(header?.plain).toBe('Parameter: retries (Default: `5`)');
        expect(header?.html).toContain('(Default: `5`)');
    });
});
