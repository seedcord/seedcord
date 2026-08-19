import { describe, expect, it } from 'vitest';

import {
    highlightInlineToHtml,
    highlightMemberToHtml,
    highlightSignatureToHtml,
    highlightToHtml,
    highlightTypeParamToHtml
} from '#src/shiki';

function textOf(html: string): string {
    return html.replaceAll(/<[^>]+>/g, '');
}

// every block renders twice, once per theme
function lightText(html: string): string {
    return textOf(/<pre class="shiki shiki-light[\s\S]*?<\/pre>/.exec(html)?.[0] ?? '');
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
        const html = await highlightToHtml(code, 'ts', [
            { name: 'Foo', href: '/packages/core/latest/foo', start, end: start + 'Foo'.length }
        ]);

        expect(html).toContain('href="/packages/core/latest/foo"');
        expect(textOf(html ?? '')).toContain('Foo');
    });

    it('opens an http link in a new tab', async () => {
        const code = 'type A = B;';
        const start = code.indexOf('B');
        const html = await highlightToHtml(code, 'ts', [
            { name: 'B', href: 'https://example.com/b', start, end: start + 1 }
        ]);

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noreferrer noopener"');
    });

    it('returns an empty string for empty input', async () => {
        await expect(highlightToHtml('')).resolves.toBe('');
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

describe('highlightInlineToHtml', () => {
    it('pairs a light and dark inline code element', async () => {
        const html = await highlightInlineToHtml('Foo');

        expect(html).toContain('shiki-inline-group');
        expect(html).toContain('shiki-inline shiki-light');
        expect(html).toContain('shiki-inline shiki-dark');
        expect(html).not.toContain('<pre');
    });
});
