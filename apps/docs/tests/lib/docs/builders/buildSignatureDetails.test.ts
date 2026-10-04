import { DocKind } from '@seedcord/docs-engine';
import { describe, expect, it, vi } from 'vitest';

import type { CommentParagraph, FormatContext, FormattedComment } from '#lib/docs/types';
import type { CodeRepresentation } from '@seedcord/ui';
import type { DocFlags, DocNode, DocSignature } from '@seedcord/docs-engine';

// justified: formatting.ts pulls in @lib/sanitizeHtml + @lib/shiki, which vitest can't resolve without vite-tsconfig-paths.
vi.mock('#lib/docs/formatting', () => {
    const code = (text: string): CodeRepresentation => ({ text, html: null });
    return {
        formatDeclarationHeader: vi.fn((header: { text: string }) => Promise.resolve(code(header.text))),
        formatSignature: vi.fn((rendered: { text: string }, _context: unknown, optional: boolean, prefix?: string) => {
            const text = optional ? rendered.text.replace('(', '?(') : rendered.text;
            return Promise.resolve(code(prefix ? `${prefix} ${text}` : text));
        }),
        highlightCode: vi.fn((text: string) => Promise.resolve(code(text)))
    };
});
// param/throws-free signatures never call formatCommentRich, so stub the module to keep its shiki imports out.
vi.mock('#lib/docs/comments/formatter', () => ({
    formatCommentRich: vi.fn(() => Promise.resolve({ paragraphs: [], examples: [] }))
}));
// renderInlineValue pulls in sanitizeHtml (unresolvable here), stub it to echo the markdown.
vi.mock('#lib/docs/comments/renderers/renderInlineValue', () => ({
    renderInlineValue: vi.fn((markdown: string) => Promise.resolve([{ plain: markdown, html: markdown }]))
}));

const { buildSignatureDetails } = await import('#lib/docs/builders/buildSignatureDetails');

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

    describe('signature code', () => {
        function memberNode(kind: number, flags: Partial<DocFlags>, sigs: [kind: number, text: string][]): DocNode {
            // buildSignatureDetails reads only these fields
            return {
                name: 'member',
                slug: 'member',
                id: 3,
                kind,
                signatures: sigs.map(([sigKind, text]) => ({ ...makeSig(text), kind: sigKind })),
                flags,
                comment: undefined
            } as unknown as DocNode;
        }

        async function codes(node: DocNode): Promise<string[]> {
            const result = await buildSignatureDetails({
                node,
                context,
                signatureComments: node.signatures.map(() => comment([])),
                description: null,
                descriptionSignatureIndex: null,
                headerSignature: { text: node.name, html: null }
            });
            return result.map((detail) => detail.code.text);
        }

        it('marks an optional method from its flags', async () => {
            const node = memberNode(DocKind.Method, { isOptional: true }, [[DocKind.Method, 'run(): void']]);
            expect(await codes(node)).toEqual(['run?(): void']);
        });

        it('writes override in the order TypeScript writes it', async () => {
            const flags: Partial<DocFlags> = { access: 'public', isStatic: true, isOverwriting: true, isAsync: true };
            const node = memberNode(DocKind.Method, flags, [[DocKind.Method, 'run(): Promise<void>']]);
            expect(await codes(node)).toEqual(['public static override async run(): Promise<void>']);
        });

        it('prefixes a getter with get', async () => {
            const node = memberNode(DocKind.Accessor, { access: 'public' }, [
                [DocKind.GetSignature, 'label(): string']
            ]);
            expect(await codes(node)).toEqual(['public get label(): string']);
        });

        it('prefixes a setter with set', async () => {
            const node = memberNode(DocKind.Accessor, { access: 'public' }, [
                [DocKind.SetSignature, 'label(value: string)']
            ]);
            expect(await codes(node)).toEqual(['public set label(value: string)']);
        });

        it('shows both sides of a get+set pair', async () => {
            const node = memberNode(DocKind.Accessor, { access: 'public' }, [
                [DocKind.GetSignature, 'label(): string'],
                [DocKind.SetSignature, 'label(value: string)']
            ]);
            expect(await codes(node)).toEqual(['public get label(): string', 'public set label(value: string)']);
        });
    });
});
