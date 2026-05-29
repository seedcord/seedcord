import {
    getSingletonHighlighter,
    type BundledLanguage,
    type BundledTheme,
    type Highlighter,
    type ShikiTransformer
} from 'shiki';

const THEMES = {
    light: 'catppuccin-latte',
    dark: 'catppuccin-macchiato'
    // light: 'gruvbox-light-medium',
    // dark: 'gruvbox-dark-medium'
    // light: 'rose-pine-dawn',
    // dark: 'rose-pine'
} as const satisfies Record<'light' | 'dark', BundledTheme>;

const COMMON_LANGS: BundledLanguage[] = ['ts', 'tsx', 'js', 'jsx', 'json'];

export interface CodeLink {
    name: string;
    href: string;
    start: number;
    end: number;
}

async function ensureHighlighter(langs: BundledLanguage[]): Promise<Highlighter> {
    const uniqueLangs = Array.from(new Set<BundledLanguage>([...COMMON_LANGS, ...langs]));
    return getSingletonHighlighter({
        themes: [THEMES.light, THEMES.dark],
        langs: uniqueLangs
    });
}

interface HastTextNode {
    type: 'text';
    value: string;
}
interface HastElement {
    type: 'element';
    tagName: string;
    properties?: Record<string, unknown>;
    children: HastChild[];
}
type HastChild = HastTextNode | HastElement;

function getClasses(node: HastElement): string[] {
    const cls = node.properties?.class;
    if (typeof cls === 'string') return cls.split(/\s+/).filter(Boolean);
    if (Array.isArray(cls)) return cls.filter((c): c is string => typeof c === 'string');
    return [];
}

function isLineElement(child: HastChild): child is HastElement {
    return child.type === 'element' && child.tagName === 'span' && getClasses(child).includes('line');
}

function extractText(node: HastChild): string {
    if (node.type === 'text') return node.value;
    return node.children.map(extractText).join('');
}

function setText(node: HastChild, text: string): void {
    if (node.type === 'text') {
        node.value = text;
        return;
    }
    node.children = [{ type: 'text', value: text }];
}

function dropSuffix(line: HastElement, suffix: string): void {
    let remaining = suffix.length;
    while (remaining > 0 && line.children.length > 0) {
        const lastIdx = line.children.length - 1;
        const last = line.children[lastIdx];
        if (!last) break;
        const text = extractText(last);
        if (text.length <= remaining) {
            remaining -= text.length;
            line.children.splice(lastIdx, 1);
            continue;
        }
        setText(last, text.slice(0, text.length - remaining));
        remaining = 0;
    }
}

function dropPrefix(line: HastElement, prefix: string): void {
    let remaining = prefix.length;
    while (remaining > 0 && line.children.length > 0) {
        const first = line.children[0];
        if (!first) break;
        const text = extractText(first);
        if (text.length <= remaining) {
            remaining -= text.length;
            line.children.shift();
            continue;
        }
        setText(first, text.slice(remaining));
        remaining = 0;
    }
}

// Ref weaving via PUA Unicode sentinels (U+E000 range): shiki's decorations API requires
// token-boundary alignment the TS grammar doesn't always give (e.g. a return-type `: Foo`
// tokenizes as one segment). Sentinels are treated as identifier-continuation chars by the
// grammar; we swap them post-render for `<a href>`. Layout per ref:
// `<OPEN><index><BOUND>name<CLOSE><index><BOUND>` so a regex can extract both index and content.

// `\uXXXX` escapes (not raw chars): macOS's font fallback maps the U+E000 PUA range to
// internal Apple glyphs, so raw literals render as Dock/iMessage icons in IDEs.
const LINK_OPEN = '\uE000';
const LINK_OPEN_BOUND = '\uE001';
const LINK_CLOSE = '\uE002';
const LINK_CLOSE_BOUND = '\uE003';
const INDEX_BASE = 0xe100;
const SENTINEL_MIN = 0xe000;
const SENTINEL_MAX = 0xe1ff;
const HEX_RADIX = 16;
const DECIMAL_RADIX = 10;

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtmlAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface SentinelLink {
    open: string;
    close: string;
    href: string;
}

// Shiki escapes our PUA chars as numeric entities; decode them back before the post-render scan.
function normalizeSentinels(html: string): string {
    return html.replace(/&#(x?)([0-9a-fA-F]+);/g, (match, isHex: string, value: string) => {
        const code = Number.parseInt(value, isHex ? HEX_RADIX : DECIMAL_RADIX);
        if (Number.isNaN(code)) return match;
        if (code >= SENTINEL_MIN && code <= SENTINEL_MAX) return String.fromCharCode(code);
        return match;
    });
}

// Walk the code string and insert sentinel wrappers around each link range. Returns the
// instrumented code and the per-link sentinel pairs for later post-render substitution.
function instrumentLinks(code: string, links: readonly CodeLink[]): { code: string; markers: SentinelLink[] } {
    if (links.length === 0) return { code, markers: [] };

    // Order links by start position so the byte-offset advance is left-to-right.
    const ordered = [...links].sort((a, b) => a.start - b.start);
    const markers: SentinelLink[] = [];
    let result = '';
    let cursor = 0;
    for (let i = 0; i < ordered.length; i += 1) {
        const link = ordered[i];
        if (!link) continue;
        const indexCode = INDEX_BASE + i;
        if (indexCode > SENTINEL_MAX) break;
        const indexChar = String.fromCharCode(indexCode);
        const open = `${LINK_OPEN}${indexChar}${LINK_OPEN_BOUND}`;
        const close = `${LINK_CLOSE}${indexChar}${LINK_CLOSE_BOUND}`;
        markers.push({ open, close, href: escapeHtmlAttr(link.href) });

        result += code.slice(cursor, link.start);
        result += open;
        result += code.slice(link.start, link.end);
        result += close;
        cursor = link.end;
    }
    result += code.slice(cursor);
    return { code: result, markers };
}

const EXTERNAL_URL_RE = /^https?:\/\//i;

function applyLinkMarkers(html: string, markers: readonly SentinelLink[], links: readonly CodeLink[]): string {
    if (markers.length === 0) return html;

    let result = normalizeSentinels(html);
    // Sentinels sometimes land alone inside their own <span> (when shiki tokenizes them as
    // standalone punctuation/identifier). Unwrap those single-sentinel spans first so the
    // open/close regex can see the bare sentinels.
    result = result.replace(/<span[^>]*>\s*([-])\s*<\/span>/g, '$1');

    for (let i = 0; i < markers.length; i += 1) {
        const marker = markers[i];
        const link = links[i];
        if (!marker || !link) continue;
        const isExternal = EXTERNAL_URL_RE.test(link.href);
        const attrs = isExternal ? ' target="_blank" rel="noreferrer noopener"' : '';
        const pattern = new RegExp(`${escapeRegex(marker.open)}([\\s\\S]*?)${escapeRegex(marker.close)}`, 'g');
        result = result.replace(
            pattern,
            (_match, content: string) => `<a href="${marker.href}"${attrs}>${content}</a>`
        );
    }

    return result;
}

const stripFunctionWrap: ShikiTransformer = {
    name: 'seedcord-strip-function-wrap',
    code(codeEl) {
        const root = codeEl as unknown as HastElement;
        const lines = root.children.filter(isLineElement);
        if (lines.length === 0) return;

        const first = lines[0];
        if (first) dropPrefix(first, 'function ');

        for (let i = lines.length - 1; i >= 0; i -= 1) {
            const line = lines[i];
            if (!line || line.children.length === 0) continue;
            dropSuffix(line, ' {}');
            break;
        }
    }
};

const stripMemberWrap: ShikiTransformer = {
    name: 'seedcord-strip-member-wrap',
    code(codeEl) {
        const root = codeEl as unknown as HastElement;
        const lines = root.children.filter(isLineElement);
        if (lines.length === 0) return;

        const first = lines[0];
        if (first) dropPrefix(first, 'class _ { ');

        for (let i = lines.length - 1; i >= 0; i -= 1) {
            const line = lines[i];
            if (!line || line.children.length === 0) continue;
            dropSuffix(line, ' }');
            dropSuffix(line, ';');
            break;
        }
    }
};

// Dual-render: shiki's CSS-variable dual-theme mode (`themes: {…}` + `defaultColor: false`)
// breaks in Safari because per-span `color: var(--shiki-dark)` against an inline custom property
// declared on the SAME span doesn't resolve in WebKit. Fix: render twice with a single `theme:`
// each, tag each `<pre>` with `shiki-light`/`shiki-dark`, wrap in `.shiki-theme-group`, and let
// globals.css toggle visibility. Each pre carries fully-resolved inline `color:#X`.

function decorateBlock(html: string, variant: 'light' | 'dark'): string {
    return html.replace('<pre class="shiki', `<pre class="shiki shiki-${variant}`);
}

async function renderDual(
    instrumented: string,
    markers: readonly SentinelLink[],
    links: readonly CodeLink[],
    lang: BundledLanguage,
    transformers: ShikiTransformer[] = []
): Promise<string> {
    const highlighter = await ensureHighlighter([lang]);
    const lightRaw = decorateBlock(
        highlighter.codeToHtml(instrumented, { lang, theme: THEMES.light, transformers }),
        'light'
    );
    const darkRaw = decorateBlock(
        highlighter.codeToHtml(instrumented, { lang, theme: THEMES.dark, transformers }),
        'dark'
    );
    const light = applyLinkMarkers(lightRaw, markers, links);
    const dark = applyLinkMarkers(darkRaw, markers, links);
    return `<div class="shiki-theme-group">${light}${dark}</div>`;
}

export async function highlightToHtml(
    code: string,
    lang: BundledLanguage = 'ts',
    links: readonly CodeLink[] = []
): Promise<string | null> {
    if (!code) return '';

    try {
        const { code: instrumented, markers } = instrumentLinks(code, links);
        return await renderDual(instrumented, markers, links, lang);
    } catch {
        return null;
    }
}

// Method-shape signatures aren't valid top-level TS: shiki's grammar tokenizes `extends`
// inside `<T extends X>` as a keyword only when a leading statement-context anchor is present.
// We wrap as a top-level function declaration (which also handles multi-line type-param
// constraints, unlike `class _ {…}`), then strip the wrap structurally via a transformer.
export async function highlightSignatureToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        const FN_PREFIX = 'function ';
        const wrapped = `${FN_PREFIX}${code} {}`;
        const shifted: CodeLink[] = links.map((l) => ({
            ...l,
            start: l.start + FN_PREFIX.length,
            end: l.end + FN_PREFIX.length
        }));
        const { code: instrumented, markers } = instrumentLinks(wrapped, shifted);
        return await renderDual(instrumented, markers, shifted, 'ts', [stripFunctionWrap]);
    } catch {
        return null;
    }
}

// Property declarations need a class-body wrap so shiki recognizes modifier keywords
// (`protected`, `readonly`): they enter `storage.modifier` scope only inside a class body.
export async function highlightMemberToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        const PREFIX = 'class _ { ';
        const wrapped = `${PREFIX}${code}; }`;
        const shifted: CodeLink[] = links.map((l) => ({
            ...l,
            start: l.start + PREFIX.length,
            end: l.end + PREFIX.length
        }));
        const { code: instrumented, markers } = instrumentLinks(wrapped, shifted);
        return await renderDual(instrumented, markers, shifted, 'ts', [stripMemberWrap]);
    } catch {
        return null;
    }
}

// Type-parameter rows like `TPluggableEvents extends X = Y` need a TYPE-PARAMETER declaration
// context: class-body wrap doesn't work because shiki's grammar tokenizes `<X extends Y = Z>`
// only when it sits inside actual generic `<…>` brackets. Wrap as `type _<row> = unknown` and
// strip the surrounding text from the hast tree.
const stripTypeParamWrap: ShikiTransformer = {
    name: 'seedcord-strip-type-param-wrap',
    code(codeEl) {
        const root = codeEl as unknown as HastElement;
        const lines = root.children.filter(isLineElement);
        if (lines.length === 0) return;

        const first = lines[0];
        if (first) dropPrefix(first, 'type _<');

        for (let i = lines.length - 1; i >= 0; i -= 1) {
            const line = lines[i];
            if (!line || line.children.length === 0) continue;
            dropSuffix(line, '> = unknown;');
            break;
        }
    }
};

export async function highlightTypeParamToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        const PREFIX = 'type _<';
        const wrapped = `${PREFIX}${code}> = unknown;`;
        const shifted: CodeLink[] = links.map((l) => ({
            ...l,
            start: l.start + PREFIX.length,
            end: l.end + PREFIX.length
        }));
        const { code: instrumented, markers } = instrumentLinks(wrapped, shifted);
        return await renderDual(instrumented, markers, shifted, 'ts', [stripTypeParamWrap]);
    } catch {
        return null;
    }
}

const CODE_INNER_RE = /<code[^>]*>([\s\S]*?)<\/code>/;

// Inline equivalent of `renderDual`. Render twice with single `theme:` each, lift the inner
// `<code>` body out of each `<pre>`, and emit a sibling pair inside `.shiki-inline-group`.
// Globals.css toggles `display: none/inline` to pick the active theme.
export async function highlightInlineToHtml(code: string, lang: BundledLanguage = 'ts'): Promise<string | null> {
    if (!code) return '';

    try {
        const highlighter = await ensureHighlighter([lang]);
        const lightInner = highlighter.codeToHtml(code, { lang, theme: THEMES.light }).match(CODE_INNER_RE);
        const darkInner = highlighter.codeToHtml(code, { lang, theme: THEMES.dark }).match(CODE_INNER_RE);
        if (!lightInner || !darkInner) return null;
        return (
            `<span class="shiki-inline-group">` +
            `<code class="shiki-inline shiki-light">${lightInner[1]}</code>` +
            `<code class="shiki-inline shiki-dark">${darkInner[1]}</code>` +
            `</span>`
        );
    } catch {
        return null;
    }
}
