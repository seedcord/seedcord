import { Marked } from 'marked';

import { sanitizeHtml } from '@lib/sanitizeHtml';
import { highlightToHtml } from '@lib/shiki';

import type { Tokens } from 'marked';
import type { BundledLanguage } from 'shiki';

// Isolated instance so README rendering stays independent of the shiki-configured global `marked`
// used for TSDoc prose (renderParagraphs.ts).
const readmeMarked = new Marked({
    async: true,
    gfm: true,
    walkTokens: async (token) => {
        if (token.type !== 'code') return;
        // Narrow token type from any. Shiki validates language at runtime.
        const { text, lang } = token as Tokens.Code;
        const html = await highlightToHtml(text, lang as BundledLanguage | undefined);
        if (html) Object.assign(token, { type: 'html', text: html });
    }
});

// the browser picks the <picture> wordmark by OS prefers-color-scheme, which the site's data-theme
// toggle can't override, so rewrite it to data-theme-gated imgs (globals.css).
function themeWordmarkPictures(html: string): string {
    return html.replace(/<picture>([\s\S]*?)<\/picture>/gi, (whole, inner: string) => {
        const darkSource = /<source\b[^>]*prefers-color-scheme:\s*dark[^>]*>/i.exec(inner);
        const img = /<img\b[^>]*>/i.exec(inner);
        if (!darkSource || !img) return whole;

        const darkSrc = /srcset\s*=\s*"([^"]+)"/i.exec(darkSource[0]);
        if (!darkSrc) return whole;

        const light = img[0].replace(/^<img/i, '<img class="readme-img-light"');
        const dark = img[0]
            .replace(/src\s*=\s*"[^"]*"/i, `src="${darkSrc[1]}"`)
            .replace(/^<img/i, '<img class="readme-img-dark"');
        return `${light}${dark}`;
    });
}

export async function renderReadme(markdown: string): Promise<string> {
    const html = await readmeMarked.parse(markdown);
    const themed = themeWordmarkPictures(html);
    // the first README image is the hero banner and the page's LCP element, so fetch it at high priority.
    const prioritized = themed.replace(/<img\b/, '<img fetchpriority="high"');
    return sanitizeHtml(prioritized);
}
