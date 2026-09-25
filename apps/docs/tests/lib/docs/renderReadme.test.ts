import { describe, expect, it } from 'vitest';

import { renderReadme } from '#lib/docs/renderReadme';

const WORDMARK_PICTURE = [
    '<p align="center">',
    '  <picture>',
    '    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />',
    '    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />',
    '  </picture>',
    '</p>'
].join('\n');

describe('renderReadme', () => {
    it('rewrites a prefers-color-scheme wordmark <picture> into data-theme-gated <img>s', async () => {
        const html = await renderReadme(WORDMARK_PICTURE);

        // the <source> media query keys off the OS setting, which the site's data-theme toggle can't drive
        expect(html).not.toContain('prefers-color-scheme');
        expect(html).not.toContain('<source');

        expect(html).toContain('class="readme-img-light"');
        expect(html).toContain('class="readme-img-dark"');
        expect(html).toContain('wordmark-light.webp');
        expect(html).toContain('wordmark-dark.webp');
    });

    it('leaves a plain README image untouched', async () => {
        const html = await renderReadme('![banner](https://cdn.seedcord.org/assets/banner.webp)');

        expect(html).toContain('src="https://cdn.seedcord.org/assets/banner.webp"');
        expect(html).not.toContain('readme-img-');
    });

    it('marks the first image as high fetch priority for the LCP', async () => {
        const html = await renderReadme('![banner](https://cdn.seedcord.org/assets/banner.webp)');

        expect(html).toContain('fetchpriority="high"');
    });

    it('highlights fenced code blocks with shiki, like TSDoc prose', async () => {
        const html = await renderReadme('```ts\nconst answer = 42;\n```');

        // same shiki output as the TSDoc prose renderer (renderParagraphs)
        expect(html).toContain('class="shiki');
        expect(html).toMatch(/style="[^"]*color:/i);
    });

    it('highlights a fence with no language as the ts default', async () => {
        // a bare ``` fence gives Marked an empty lang string, which must still use the ts default
        const html = await renderReadme('```\nconst answer = 42;\n```');

        expect(html).toContain('class="shiki');
        expect(html).toMatch(/color:[^"]*">const/i);
    });

    it('falls back to a plain code block for an unsupported language', async () => {
        // python is not in the loaded shiki grammar set
        const html = await renderReadme('```python\nprint("hi")\n```');

        expect(html).toContain('print("hi")');
        expect(html).not.toContain('class="shiki');
    });

    it('resolves a readme link to its own heading', async () => {
        const html = await renderReadme('## Contents\n\n- [Build a card](#build-a-card)\n\n## Build a card\n');

        expect(html).toContain('id="build-a-card"');
    });

    it('slugs a heading the way GitHub does, so a README written for GitHub keeps working', async () => {
        const html = await renderReadme('## JSX setup\n\n## Put it in your page\n\n## toComponentEmbed()\n');

        expect(html).toContain('id="jsx-setup"');
        expect(html).toContain('id="put-it-in-your-page"');
        expect(html).toContain('id="tocomponentembed"');
    });

    it('suffixes a repeated heading so both ids stay reachable', async () => {
        const html = await renderReadme('## Usage\n\n## Usage\n');

        expect(html).toContain('id="usage"');
        expect(html).toContain('id="usage-1"');
    });

    it('keeps every id distinct when a heading already reads like a suffixed repeat', async () => {
        const html = await renderReadme('## Usage\n\n## Usage 1\n\n## Usage\n');
        const ids = [...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => id);

        expect(ids).toEqual(['usage', 'usage-1', 'usage-2']);
    });

    it('slugs a heading holding inline html by the text a reader sees', async () => {
        expect(await renderReadme('## Hello <em>world</em>\n')).toContain('id="hello-world"');
    });

    it('keeps the angle-bracket text of a code span in the id, as GitHub does', async () => {
        expect(await renderReadme('## `Array<T>`\n')).toContain('id="arrayt"');
    });

    it('keeps accented letters in an id, as GitHub does', async () => {
        expect(await renderReadme('## Café au lait\n')).toContain('id="café-au-lait"');
    });
});
