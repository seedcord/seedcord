import { getSingletonHighlighter, type BundledLanguage, type BundledTheme, type Highlighter } from 'shiki';

const THEMES = {
    dark: 'catppuccin-macchiato',
    light: 'catppuccin-latte'
    // dark: 'gruvbox-dark-medium',
    // light: 'gruvbox-light-medium'
    // dark: 'rose-pine',
    // light: 'rose-pine-dawn'
} as const satisfies Record<'dark' | 'light', BundledTheme>;

const COMMON_LANGS: BundledLanguage[] = ['ts', 'tsx', 'js', 'jsx', 'json'];

interface LinkMarker {
    open: string;
    close: string;
    url: string;
}

const LINK_OPEN_SENTINEL = '\uE000';
const LINK_OPEN_BOUNDARY_SENTINEL = '\uE001';
const LINK_CLOSE_SENTINEL = '\uE002';
const LINK_CLOSE_BOUNDARY_SENTINEL = '\uE003';
const TOKEN_BASE_CODE_POINT = 0xe100;
const SENTINEL_MIN_CODE_POINT = 0xe000;
const SENTINEL_MAX_CODE_POINT = 0xe1ff;
const HEX_RADIX = 16;
const DECIMAL_RADIX = 10;

function normalizeLinkSentinels(html: string): string {
    return html.replace(/&#(x?)([0-9a-f]+);/gi, (match, isHex: string, value: string) => {
        const codePoint = Number.parseInt(value, isHex ? HEX_RADIX : DECIMAL_RADIX);

        if (Number.isNaN(codePoint)) {
            return match;
        }

        if (codePoint >= SENTINEL_MIN_CODE_POINT && codePoint <= SENTINEL_MAX_CODE_POINT) {
            return String.fromCharCode(codePoint);
        }

        return match;
    });
}

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtmlAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function preprocessMarkdownLinks(code: string): { code: string; markers: LinkMarker[] } {
    const markers: LinkMarker[] = [];
    const processed = code.replace(
        /\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^)\s]+)\)/g,
        (_match, label: string, url: string) => {
            const index = markers.length;
            const codePoint = TOKEN_BASE_CODE_POINT + index;

            if (codePoint > SENTINEL_MAX_CODE_POINT) {
                return _match;
            }

            const tokenChar = String.fromCharCode(codePoint);
            const open = `${LINK_OPEN_SENTINEL}${tokenChar}${LINK_OPEN_BOUNDARY_SENTINEL}`;
            const close = `${LINK_CLOSE_SENTINEL}${tokenChar}${LINK_CLOSE_BOUNDARY_SENTINEL}`;
            const safeUrl = escapeHtmlAttr(url);

            markers.push({ open, close, url: safeUrl });

            return `${open}${label}${close}`;
        }
    );

    return { code: processed, markers };
}

// NEW: only external (http/https) links get target+rel
const isExternalUrl = (url: string): boolean => /^https?:\/\//i.test(url);

function applyLinkMarkers(html: string, markers: readonly LinkMarker[]): string {
    if (!markers.length) {
        return html;
    }

    let result = normalizeLinkSentinels(html);
    result = result.replace(/<span[^>]*>\s*([\uE000-\uE1FF])\s*<\/span>/g, '$1');

    for (const marker of markers) {
        const pattern = new RegExp(`${escapeForRegex(marker.open)}([\\s\\S]*?)${escapeForRegex(marker.close)}`, 'g');

        result = result.replace(pattern, (_match, labelHtml: string) => {
            const attrs = isExternalUrl(marker.url) ? ' target="_blank" rel="noreferrer noopener"' : '';
            return `<a href="${marker.url}"${attrs}>${labelHtml}</a>`;
        });
    }

    return result;
}

async function ensureHighlighter(langs: BundledLanguage[]): Promise<Highlighter> {
    const uniqueLangs = Array.from(new Set<BundledLanguage>([...COMMON_LANGS, ...langs]));

    return getSingletonHighlighter({
        themes: [THEMES.dark, THEMES.light],
        langs: uniqueLangs
    });
}

function decorateBlock(html: string, variant: keyof typeof THEMES): string {
    return html.replace(/<pre class="shiki/g, `<pre class="shiki shiki-${variant}`);
}

function extractCode(html: string): string | null {
    const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    return match?.[1] ?? null;
}

export async function highlightToHtml(code: string, lang: BundledLanguage = 'ts'): Promise<string | null> {
    if (!code) {
        return '';
    }

    try {
        const { code: preparedCode, markers } = preprocessMarkdownLinks(code);
        const highlighter = await ensureHighlighter([lang]);
        const darkHtmlRaw = decorateBlock(highlighter.codeToHtml(preparedCode, { lang, theme: THEMES.dark }), 'dark');
        const lightHtmlRaw = decorateBlock(
            highlighter.codeToHtml(preparedCode, { lang, theme: THEMES.light }),
            'light'
        );

        const processedDark = applyLinkMarkers(darkHtmlRaw, markers);
        const processedLight = applyLinkMarkers(lightHtmlRaw, markers);

        return `
            <div class="shiki-theme-group">${processedDark}${processedLight}</div>
        `;
    } catch {
        return null;
    }
}

export async function highlightInlineToHtml(code: string, lang: BundledLanguage = 'ts'): Promise<string | null> {
    if (!code) {
        return '';
    }

    try {
        const { code: preparedCode, markers } = preprocessMarkdownLinks(code);
        const highlighter = await ensureHighlighter([lang]);
        const darkHtmlRaw = applyLinkMarkers(
            highlighter.codeToHtml(preparedCode, { lang, theme: THEMES.dark }),
            markers
        );
        const lightHtmlRaw = applyLinkMarkers(
            highlighter.codeToHtml(preparedCode, { lang, theme: THEMES.light }),
            markers
        );

        const darkCode = extractCode(darkHtmlRaw);
        const lightCode = extractCode(lightHtmlRaw);

        if (!darkCode || !lightCode) {
            return null;
        }

        return `\
<span class="shiki-inline-group">\
<code class="shiki-inline shiki-dark" data-variant="dark">${darkCode}</code>\
<code class="shiki-inline shiki-light" data-variant="light">${lightCode}</code>\
</span>`;
    } catch {
        return null;
    }
}
