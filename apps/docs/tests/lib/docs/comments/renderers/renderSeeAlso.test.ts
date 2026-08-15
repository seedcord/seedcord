import { describe, expect, it, vi } from 'vitest';

import type { FormatContext } from '#lib/docs/types';
import type { DocComment, DocCommentBlockTag, VersionedDocsEngine } from '@seedcord/docs-engine';

const resolveInlineHrefMock = vi.fn<(...args: unknown[]) => string | null>(() => null);
vi.mock('../../../../../src/lib/docs/comments/resolvers', () => ({
    resolveInlineHref: (...args: unknown[]) => resolveInlineHrefMock(...args)
}));

const { renderSeeAlso } = await import('#lib/docs/comments/renderers/renderSeeAlso');

type DisplayPart =
    | { kind: 'text'; text: string }
    | { kind: 'code'; text: string }
    | { kind: 'inline-tag'; tag: string; text: string; url?: string; target?: number };

function makeSeeTag(text: string, content: DisplayPart[] = []): DocCommentBlockTag {
    // justified: fixture-only DisplayPart matches the subset of CommentDisplayPart fields the renderer reads.
    return { tag: '@see', text, content: content as unknown as DocCommentBlockTag['content'] };
}

function makeComment(blockTags: DocCommentBlockTag[]): DocComment {
    return {
        summary: '',
        summaryParts: [],
        blockTags,
        modifierTags: [],
        examples: []
    };
}

function makeContext(): FormatContext {
    const engine = {} as unknown as VersionedDocsEngine;
    return { engine, manifestPackage: 'seedcord' };
}

describe('renderSeeAlso', () => {
    it('returns undefined when the comment has no block tags', () => {
        expect(renderSeeAlso(makeComment([]), makeContext())).toBeUndefined();
    });

    it('returns undefined when block tags contain no @see entries', () => {
        const comment = makeComment([{ tag: '@example', text: 'foo', content: [] }]);
        expect(renderSeeAlso(comment, makeContext())).toBeUndefined();
    });

    it('returns undefined when @see tags have neither name nor href', () => {
        const comment = makeComment([makeSeeTag('   ')]);
        expect(renderSeeAlso(comment, makeContext())).toBeUndefined();
    });

    it('returns a single entry for a single plain-name @see', () => {
        const comment = makeComment([makeSeeTag('OtherClass')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'OtherClass' }]);
    });

    it('splits names on bullet markers (•)', () => {
        const comment = makeComment([makeSeeTag('• Foo\n• Bar\n• Baz')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Foo' }, { name: 'Bar' }, { name: 'Baz' }]);
    });

    it('splits names on em-dash separators within a line', () => {
        const comment = makeComment([makeSeeTag('Foo — Bar — Baz')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Foo' }, { name: 'Bar' }, { name: 'Baz' }]);
    });

    it('splits names on en-dash and hyphen separators within a line', () => {
        const comment = makeComment([makeSeeTag('Foo – Bar - Baz')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Foo' }, { name: 'Bar' }, { name: 'Baz' }]);
    });

    it('splits names on commas when no dash separator is present', () => {
        const comment = makeComment([makeSeeTag('Foo, Bar, Baz')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Foo' }, { name: 'Bar' }, { name: 'Baz' }]);
    });

    it('prefers dash splitting over comma splitting when both are present', () => {
        const comment = makeComment([makeSeeTag('Foo, Bar — Baz')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Foo, Bar' }, { name: 'Baz' }]);
    });

    it('strips leading bullets, asterisks, and hyphens from each line', () => {
        const comment = makeComment([makeSeeTag('- Foo\n* Bar\n• Baz')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Foo' }, { name: 'Bar' }, { name: 'Baz' }]);
    });

    it('reads a name from an inline-tag part when the block text is empty', () => {
        const inline: DisplayPart = {
            kind: 'inline-tag',
            tag: '@link',
            text: 'Linked'
        };
        const comment = makeComment([makeSeeTag('', [inline])]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Linked' }]);
    });

    it('captures href and target from an inline-tag part', () => {
        const inline: DisplayPart = {
            kind: 'inline-tag',
            tag: '@link',
            text: 'Linked',
            url: 'https://example.com/x',
            target: 42
        };
        const comment = makeComment([makeSeeTag('', [inline])]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([
            { name: 'Linked', href: 'https://example.com/x', external: true, target: 42 }
        ]);
    });

    it('flags an external href as external (new tab) and leaves a same-package href un-flagged', () => {
        resolveInlineHrefMock.mockReturnValueOnce('/packages/utils/latest/functions/clamp');
        const crossPkg = makeComment([makeSeeTag('clamp')]);
        expect(renderSeeAlso(crossPkg, makeContext())).toEqual([
            { name: 'clamp', href: '/packages/utils/latest/functions/clamp', external: true }
        ]);

        resolveInlineHrefMock.mockReturnValueOnce('/packages/seedcord/latest/classes/Seedcord');
        const samePkg = makeComment([makeSeeTag('Seedcord')]);
        expect(renderSeeAlso(samePkg, makeContext())).toEqual([
            { name: 'Seedcord', href: '/packages/seedcord/latest/classes/Seedcord' }
        ]);
    });

    it('falls back to resolveInlineHref when the inline tag has a target but no url', () => {
        resolveInlineHrefMock.mockReturnValueOnce('/resolved');
        const inline: DisplayPart = {
            kind: 'inline-tag',
            tag: '@link',
            text: 'Linked',
            target: 7
        };
        const comment = makeComment([makeSeeTag('', [inline])]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Linked', href: '/resolved', target: 7 }]);
        expect(resolveInlineHrefMock).toHaveBeenCalled();
    });

    it('resolves a @see by name (search fallback) when it has neither href nor target', () => {
        // API Extractor leaves many in-repo `@see {@link X}` destinations unresolved, so the renderer
        // must still attempt resolution by the entry name rather than only when a target is present.
        resolveInlineHrefMock.mockReturnValueOnce('/packages/seedcord/0.10.6/types/command-route-string');
        const comment = makeComment([makeSeeTag('CommandRouteString')]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([
            { name: 'CommandRouteString', href: '/packages/seedcord/0.10.6/types/command-route-string' }
        ]);
        expect(resolveInlineHrefMock).toHaveBeenCalled();
    });

    it('reads a name from a plain text part when block text is empty', () => {
        const text: DisplayPart = { kind: 'text', text: 'PlainName' };
        const comment = makeComment([makeSeeTag('', [text])]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'PlainName' }]);
    });

    it('keeps the block-text name when both block text and inline parts contribute', () => {
        const inline: DisplayPart = {
            kind: 'inline-tag',
            tag: '@link',
            text: 'FromInline',
            url: 'https://example.com/u'
        };
        const comment = makeComment([makeSeeTag('FromBlockText', [inline])]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([
            { name: 'FromBlockText', href: 'https://example.com/u', external: true }
        ]);
    });

    it('emits one entry per split name and propagates href and target to each', () => {
        const inline: DisplayPart = {
            kind: 'inline-tag',
            tag: '@link',
            text: 'Foo, Bar',
            url: 'https://example.com/group',
            target: 99
        };
        const comment = makeComment([makeSeeTag('', [inline])]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([
            { name: 'Foo', href: 'https://example.com/group', external: true, target: 99 },
            { name: 'Bar', href: 'https://example.com/group', external: true, target: 99 }
        ]);
    });

    it('aggregates multiple @see block tags into a single result list', () => {
        const comment = makeComment([
            makeSeeTag('Alpha'),
            { tag: '@example', text: 'ignored', content: [] },
            makeSeeTag('Beta, Gamma')
        ]);
        expect(renderSeeAlso(comment, makeContext())).toEqual([{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }]);
    });
});
