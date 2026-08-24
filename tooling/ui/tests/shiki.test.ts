import { describe, expect, it } from 'vitest';

import {
    isHighlightable,
    highlightInlineToHtml,
    highlightMemberToHtml,
    highlightSignatureToHtml,
    highlightToHtml,
    highlightTypeParamToHtml
} from '#src/shiki';

import type { ShikiTransformer } from 'shiki';

const ENTITIES: Record<string, string> = {
    '&#x3C;': '<',
    '&lt;': '<',
    '&gt;': '>',
    '&#x26;': '&',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'"
};

function textOf(html: string): string {
    return html
        .replaceAll(/<[^>]+>/g, '')
        .replaceAll(/&(?:#x3C|#x26|#39|lt|gt|amp|quot);/g, (match) => ENTITIES[match] ?? match);
}

function codeText(html: string): string {
    return textOf(/<pre[\s\S]*?<\/pre>/.exec(html)?.[0] ?? '');
}

// hast decides the attribute order
const ANCHOR_RE = /<a\s([^>]*)>/g;

function attrsFor(html: string, href: string): string[] {
    return [...html.matchAll(ANCHOR_RE)]
        .map((match) => match[1] ?? '')
        .filter((attrs) => attrs.includes(`href="${href}"`));
}

describe('highlightToHtml', () => {
    it('renders one block carrying both theme colours', async () => {
        const html = await highlightToHtml('const x = 1;');

        expect(html?.match(/<pre/g)).toHaveLength(1);
        expect(html).toMatch(/color:light-dark\(#[0-9a-fA-F]+, #[0-9a-fA-F]+\)/);
    });

    // the @supports fallback in shiki.css reads these
    it('keeps a per-theme custom property on each token', async () => {
        const html = await highlightToHtml('const x = 1;');

        expect(html).toContain('--shiki-light:');
        expect(html).toContain('--shiki-dark:');
    });

    it('turns a link range into an anchor around that text', async () => {
        const code = 'const x: Foo = bar;';
        const start = code.indexOf('Foo');
        const html = await highlightToHtml(code, 'ts', {
            links: [{ name: 'Foo', href: '/packages/core/latest/foo', start, end: start + 'Foo'.length }]
        });

        expect(html).toContain('href="/packages/core/latest/foo"');
        expect(textOf(html ?? '')).toContain('Foo');
    });

    it('opens an http link in a new tab', async () => {
        const code = 'type A = B;';
        const start = code.indexOf('B');
        const html = await highlightToHtml(code, 'ts', {
            links: [{ name: 'B', href: 'https://example.com/b', start, end: start + 1 }]
        });

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noreferrer noopener"');
    });

    it('gives each href its own target when the links arrive out of order', async () => {
        const code = 'const value: Local = remote();';
        const remoteStart = code.indexOf('remote');
        const localStart = code.indexOf('Local');
        const links = [
            {
                name: 'remote',
                href: 'https://example.com/remote',
                start: remoteStart,
                end: remoteStart + 'remote'.length
            },
            { name: 'Local', href: '/docs/local', start: localStart, end: localStart + 'Local'.length }
        ];

        const html = (await highlightToHtml(code, 'ts', { links })) ?? '';

        const local = attrsFor(html, '/docs/local');
        const remote = attrsFor(html, 'https://example.com/remote');

        expect(local.length).toBeGreaterThan(0);
        expect(remote.length).toBeGreaterThan(0);
        expect(local.every((attrs) => !attrs.includes('target'))).toBe(true);
        expect(remote.every((attrs) => attrs.includes('target="_blank"'))).toBe(true);
    });

    it('keeps a subtraction operator coloured in a block that carries a link', async () => {
        const code = 'const gap = end - start;';
        const start = code.indexOf('end');
        const html =
            (await highlightToHtml(code, 'ts', {
                links: [{ name: 'end', href: '/docs/end', start, end: start + 'end'.length }]
            })) ?? '';

        expect(html).toContain('href="/docs/end"');
        expect(html).toMatch(/<span[^>]*>\s*-\s*<\/span>/);
    });

    it('returns an empty string for empty input', async () => {
        await expect(highlightToHtml('')).resolves.toBe('');
    });

    it('runs a caller transformer over the block', async () => {
        const marker: ShikiTransformer = {
            name: 'marker',
            pre(node) {
                this.addClassToHast(node, 'from-a-transformer');
            }
        };

        const html = (await highlightToHtml('const x = 1;', 'ts', { transformers: [marker] })) ?? '';

        expect(html.match(/from-a-transformer/g)).toHaveLength(1);
    });
});

function anchorTextFor(html: string, href: string): string | null {
    const match = new RegExp(String.raw`<a\s[^>]*href="${href}"[^>]*>([\s\S]*?)</a>`).exec(html);

    return match ? textOf(match[1] ?? '') : null;
}

describe('the wrapped fragment helpers', () => {
    it('drops the function wrap a signature needed to tokenize', async () => {
        const html = await highlightSignatureToHtml('doThing(count: number): void');

        expect(codeText(html ?? '')).toBe('doThing(count: number): void');
    });

    it('drops the class wrap a member needed to tokenize', async () => {
        const html = await highlightMemberToHtml('protected readonly name: string');

        expect(codeText(html ?? '')).toBe('protected readonly name: string');
    });

    it('drops the type alias wrap a type parameter needed to tokenize', async () => {
        const html = await highlightTypeParamToHtml('T extends string = never');

        expect(codeText(html ?? '')).toBe('T extends string = never');
    });

    it('keeps a multi-line generic signature intact', async () => {
        const code = ['doThing<', '    T extends Record<string, unknown>', '>(value: T): void'].join('\n');

        const html = await highlightSignatureToHtml(code);

        expect(codeText(html ?? '')).toBe(code);
    });

    it('anchors a signature link on exactly the linked name', async () => {
        const code = 'doThing(count: Counter): void';
        const start = code.indexOf('Counter');

        const html =
            (await highlightSignatureToHtml(code, [
                { name: 'Counter', href: '/d/counter', start, end: start + 'Counter'.length }
            ])) ?? '';

        expect(anchorTextFor(html, '/d/counter')).toBe('Counter');
        expect(codeText(html)).toBe(code);
    });

    it('anchors a member link on exactly the linked name', async () => {
        const code = 'protected readonly source: ArraySource';
        const start = code.indexOf('ArraySource');

        const html =
            (await highlightMemberToHtml(code, [
                { name: 'ArraySource', href: '/d/array-source', start, end: start + 'ArraySource'.length }
            ])) ?? '';

        expect(anchorTextFor(html, '/d/array-source')).toBe('ArraySource');
        expect(codeText(html)).toBe(code);
    });

    it('anchors a type parameter link on exactly the linked name', async () => {
        const code = 'Route extends SlashOptionRegistry';
        const start = code.indexOf('SlashOptionRegistry');

        const html =
            (await highlightTypeParamToHtml(code, [
                { name: 'SlashOptionRegistry', href: '/d/registry', start, end: start + 'SlashOptionRegistry'.length }
            ])) ?? '';

        expect(anchorTextFor(html, '/d/registry')).toBe('SlashOptionRegistry');
        expect(codeText(html)).toBe(code);
    });
});

describe('isHighlightable', () => {
    it.each(['ts', 'typescript', 'tsx', 'js', 'javascript', 'jsx', 'json', 'bash'])('accepts %s', (lang) => {
        expect(isHighlightable(lang)).toBe(true);
    });

    it.each(['python', 'rust', 'go', 'css', ''])('rejects %s, which the highlighter never loaded', (lang) => {
        expect(isHighlightable(lang)).toBe(false);
    });
});

describe('highlightInlineToHtml', () => {
    it('renders one inline code element carrying both theme colours', async () => {
        const html = (await highlightInlineToHtml('Foo')) ?? '';

        expect(html.match(/<code/g)).toHaveLength(1);
        expect(html).toContain('shiki-inline');
        expect(html).toMatch(/color:light-dark\(/);
        expect(html).not.toContain('<pre');
        expect(html).not.toContain('class="line"');
    });
});
