import { Marked } from 'marked';

import { sanitizeHtml } from '#lib/sanitizeHtml';
import { highlightToHtml } from '#lib/shiki';

import type { Tokens } from 'marked';
import type { BundledLanguage } from 'shiki';

// a separate marked instance keeps readme rendering independent of the shiki-configured global marked
// in renderParagraphs.ts.
const readmeMarked = new Marked({
    async: true,
    gfm: true,
    walkTokens: async (token) => {
        if (token.type !== 'code') return;
        // the cast narrows token past marked's union. shiki validates the language string at runtime regardless.
        const { text, lang } = token as Tokens.Code;
        // a fence with no language tag leaves lang empty, so `||` picks the helper's ts default
        const html = await highlightToHtml(text, (lang || undefined) as BundledLanguage | undefined);
        if (html) Object.assign(token, { type: 'html', text: html });
    }
});

// the browser picks the <picture> wordmark by OS prefers-color-scheme, and the site's data-theme
// toggle can't override that. this rewrites it into data-theme-gated imgs, styled in globals.css.
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
