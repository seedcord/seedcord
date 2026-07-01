import { describe, expect, it } from 'vitest';

import { renderReadme } from '@lib/docs/renderReadme';

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
});
