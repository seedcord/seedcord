import GithubSlugger from 'github-slugger';
import { Marked, TextRenderer } from 'marked';

import { sanitizeHtml } from '#lib/sanitizeHtml';
import { highlightToHtml } from '@seedcord/ui/shiki';

import type { Tokens } from 'marked';
import type { BundledLanguage } from 'shiki';

// GitHub removes inline html tags from a heading before it slugs the heading
class VisibleText extends TextRenderer {
    override html(): string {
        return '';
    }
}

const visibleText = new VisibleText();

// github resolves a README's relative links against its folder. ?raw=true serves an image as a file
function resolveAgainst(folderUrl: string, token: Tokens.Link | Tokens.Image): void {
    const { href } = token;
    if (href.startsWith('#') || href.startsWith('/') || URL.canParse(href)) return;

    const resolved = new URL(href, `${folderUrl}/`);
    if (token.type === 'image') resolved.searchParams.set('raw', 'true');
    token.href = resolved.href;
}

// a separate marked instance keeps readme rendering independent of the shiki-configured global marked
// in renderParagraphs.ts.
function readmeMarked(folderUrl: string | undefined): Marked {
    // one per readme, since it numbers repeated headings
    const slugger = new GithubSlugger();

    return new Marked({
        async: true,
        gfm: true,
        walkTokens: async (token) => {
            if (folderUrl && (token.type === 'link' || token.type === 'image')) {
                resolveAgainst(folderUrl, token as Tokens.Link | Tokens.Image);
                return;
            }
            if (token.type !== 'code') return;
            // the cast narrows token past marked's union. shiki validates the language string at runtime regardless.
            const { text, lang } = token as Tokens.Code;
            // a fence with no language tag leaves lang empty, so `||` picks the helper's ts default
            const html = await highlightToHtml(text, (lang || undefined) as BundledLanguage | undefined);
            if (html) Object.assign(token, { type: 'html', text: html });
        },
        renderer: {
            // marked leaves the id off a heading
            heading({ tokens, depth }: Tokens.Heading): string {
                const text = this.parser.parseInline(tokens);
                const id = slugger.slug(this.parser.parseInline(tokens, visibleText));
                return `<h${String(depth)} id="${id}">${text}</h${String(depth)}>\n`;
            }
        }
    });
}

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

export async function renderReadme(markdown: string, folderUrl?: string): Promise<string> {
    const html = await readmeMarked(folderUrl).parse(markdown);
    const themed = themeWordmarkPictures(html);
    // the first README image is the hero banner and the page's LCP element, so fetch it at high priority.
    const prioritized = themed.replace(/<img\b/, '<img fetchpriority="high"');
    return sanitizeHtml(prioritized);
}
