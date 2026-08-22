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

function textOf(html: string): string {
    return html.replaceAll(/<[^>]+>/g, '');
}

function lightText(html: string): string {
    return textOf(/<pre class="shiki shiki-light[\s\S]*?<\/pre>/.exec(html)?.[0] ?? '');
}

const ANCHOR_RE = /<a href="([^"]*)"([^>]*)>/g;

function attrsFor(html: string, href: string): string[] {
    return [...html.matchAll(ANCHOR_RE)].filter((match) => match[1] === href).map((match) => match[2] ?? '');
}

describe('highlightToHtml', () => {
    it('renders one block per theme so a span carries a resolved colour', async () => {
        const html = await highlightToHtml('const x = 1;');

        expect(html).toContain('shiki-theme-group');
        expect(html).toContain('shiki-light');
        expect(html).toContain('shiki-dark');
        expect(html?.match(/<pre/g)).toHaveLength(2);
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

    it('returns an empty string for empty input', async () => {
        await expect(highlightToHtml('')).resolves.toBe('');
    });

    it('runs a caller transformer over both themes', async () => {
        const marker: ShikiTransformer = {
            name: 'marker',
            pre(node) {
                this.addClassToHast(node, 'from-a-transformer');
            }
        };

        const html = (await highlightToHtml('const x = 1;', 'ts', { transformers: [marker] })) ?? '';

        expect(html.match(/from-a-transformer/g)).toHaveLength(2);
    });
});

describe('the wrapped fragment helpers', () => {
    it('drops the function wrap a signature needed to tokenize', async () => {
        const html = await highlightSignatureToHtml('doThing(count: number): void');

        expect(lightText(html ?? '')).toBe('doThing(count: number): void');
    });

    it('drops the class wrap a member needed to tokenize', async () => {
        const html = await highlightMemberToHtml('protected readonly name: string');

        expect(lightText(html ?? '')).toBe('protected readonly name: string');
    });

    it('drops the type alias wrap a type parameter needed to tokenize', async () => {
        const html = await highlightTypeParamToHtml('T extends string = never');

        expect(lightText(html ?? '')).toBe('T extends string = never');
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
    it('pairs a light and dark inline code element', async () => {
        const html = await highlightInlineToHtml('Foo');

        expect(html).toContain('shiki-inline-group');
        expect(html).toContain('shiki-inline shiki-light');
        expect(html).toContain('shiki-inline shiki-dark');
        expect(html).not.toContain('<pre');
    });
});
