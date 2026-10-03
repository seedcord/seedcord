import { describe, expect, it, vi } from 'vitest';

import type { CommentParagraph, FormatContext, FormattedComment } from '#lib/docs/types';
import type { CodeRepresentation } from '@seedcord/ui';
import type { DocComment, DocFlags, DocNode } from '@seedcord/docs-engine';

// justified: formatting.ts pulls in @lib/sanitizeHtml + @lib/shiki, which vitest can't resolve without vite-tsconfig-paths.
vi.mock('../../../../src/lib/docs/formatting', () => {
    const code = (text: string): CodeRepresentation => ({ text, html: null });
    return {
        formatDeclarationHeader: vi.fn((header: { text: string }, _context: unknown, optional: boolean) =>
            Promise.resolve(code(optional ? header.text.replace(':', '?:') : header.text))
        ),
        formatSignature: vi.fn((rendered: { text: string }) => Promise.resolve(code(rendered.text))),
        highlightCode: vi.fn((text: string) => Promise.resolve(code(text)))
    };
});

const { selectDescription, stripDuplicateDescription, buildDeprecationStatusFromNodeLike, resolveHeaderSignature } =
    await import('#lib/docs/builders/utils');

const emptyFlags: DocFlags = {
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

function makeFlags(overrides: Partial<DocFlags> = {}): DocFlags {
    return { ...emptyFlags, ...overrides };
}

function makeNode(partial: Partial<DocNode>): DocNode {
    return {
        name: 'stub',
        signatures: [],
        flags: emptyFlags,
        ...partial
    } as unknown as DocNode;
}

function makeParagraph(plain: string): CommentParagraph {
    return { plain, html: plain };
}

function makeFormattedComment(paragraphs: CommentParagraph[]): FormattedComment {
    return { paragraphs, examples: [] };
}

const context = {} as FormatContext;

describe('resolveHeaderSignature', () => {
    it('marks an optional property from its flags', async () => {
        const node = makeNode({
            header: { text: 'tag: string', keyword: null } as never,
            flags: makeFlags({ isOptional: true })
        });

        const result = await resolveHeaderSignature(node, context);

        expect(result.text).toBe('tag?: string');
    });
});

describe('selectDescription', () => {
    it('returns the first paragraph of the first signature comment that has one', () => {
        const target = makeParagraph('from sig 1');
        const signatureComments = [makeFormattedComment([]), makeFormattedComment([target, makeParagraph('after')])];
        const nodeComment = makeFormattedComment([makeParagraph('node-level')]);

        const result = selectDescription(signatureComments, nodeComment);

        expect(result).toEqual({ description: target, signatureIndex: 1 });
    });

    it('skips undefined signature comments before falling back', () => {
        const target = makeParagraph('node-level');
        const signatureComments = [undefined, makeFormattedComment([])];
        const nodeComment = makeFormattedComment([target]);

        const result = selectDescription(signatureComments, nodeComment);

        expect(result).toEqual({ description: target, signatureIndex: null });
    });

    it('returns a null description when nothing has a paragraph', () => {
        const result = selectDescription([undefined, makeFormattedComment([])], makeFormattedComment([]));

        expect(result).toEqual({ description: null, signatureIndex: null });
    });

    it('promotes nothing when two or more overloads each document themselves', () => {
        const signatureComments = [
            makeFormattedComment([makeParagraph('unbounded form')]),
            makeFormattedComment([makeParagraph('bounded form')])
        ];

        const result = selectDescription(signatureComments, makeFormattedComment([]));

        // each overload keeps its own description in its panel, so neither is pinned to the static header
        expect(result).toEqual({ description: null, signatureIndex: null });
    });

    it('uses the shared node-level lead for the header when two or more overloads document themselves', () => {
        const nodeLead = makeParagraph('shared lead');
        const signatureComments = [
            makeFormattedComment([makeParagraph('overload one')]),
            makeFormattedComment([makeParagraph('overload two')])
        ];

        const result = selectDescription(signatureComments, makeFormattedComment([nodeLead]));

        expect(result).toEqual({ description: nodeLead, signatureIndex: null });
    });
});

describe('stripDuplicateDescription', () => {
    it('drops the first paragraph when it is reference-equal to the description', () => {
        const head = makeParagraph('intro');
        const tail = makeParagraph('details');

        const result = stripDuplicateDescription([head, tail], head);

        expect(result).toEqual([tail]);
    });

    it('clones the full array when no description is provided', () => {
        const paragraphs = [makeParagraph('a'), makeParagraph('b')];

        const result = stripDuplicateDescription(paragraphs, null);

        expect(result).toEqual(paragraphs);
        expect(result).not.toBe(paragraphs);
    });

    it('does not strip when the description matches by value but not by identity', () => {
        const paragraphs = [makeParagraph('intro'), makeParagraph('tail')];
        const lookalike = makeParagraph('intro');

        const result = stripDuplicateDescription(paragraphs, lookalike);

        expect(result).toEqual(paragraphs);
    });

    it('clones rather than returning the input reference', () => {
        const paragraphs: readonly CommentParagraph[] = [makeParagraph('a')];

        const result = stripDuplicateDescription(paragraphs, null);

        expect(result).not.toBe(paragraphs);
    });
});

describe('buildDeprecationStatusFromNodeLike', () => {
    it('returns { isDeprecated: false } when the flag is unset', () => {
        const status = buildDeprecationStatusFromNodeLike({
            flags: makeFlags({ isDeprecated: false }),
            comment: null
        });

        expect(status).toEqual({ isDeprecated: false });
    });

    it('returns isDeprecated true with no message when there is no @deprecated block', () => {
        const status = buildDeprecationStatusFromNodeLike({
            flags: makeFlags({ isDeprecated: true }),
            comment: null
        });

        expect(status).toEqual({ isDeprecated: true, deprecationMessage: undefined });
    });

    it('attaches a paragraph built from the @deprecated tag text', () => {
        const comment: DocComment = {
            summary: '',
            summaryParts: [],
            blockTags: [
                { tag: '@since', text: '1.0', content: [] },
                { tag: '@deprecated', text: 'use replacement()', content: [] }
            ],
            modifierTags: [],
            examples: []
        };

        const status = buildDeprecationStatusFromNodeLike({
            flags: makeFlags({ isDeprecated: true }),
            comment
        });

        expect(status.isDeprecated).toBe(true);
        if (!status.isDeprecated) throw new Error('unreachable: just asserted true');
        expect(status.deprecationMessage).toHaveLength(1);
        const first = status.deprecationMessage?.[0];
        if (!first) throw new Error('unreachable: just asserted length 1');
        expect(first.plain).toBe('use replacement()');
    });

    it('omits the message when the @deprecated tag has empty text', () => {
        const comment: DocComment = {
            summary: '',
            summaryParts: [],
            blockTags: [{ tag: '@deprecated', text: '', content: [] }],
            modifierTags: [],
            examples: []
        };

        const status = buildDeprecationStatusFromNodeLike({
            flags: makeFlags({ isDeprecated: true }),
            comment
        });

        expect(status).toEqual({ isDeprecated: true, deprecationMessage: undefined });
    });
});
