import langBash from '@shikijs/langs/bash';
import langJs from '@shikijs/langs/javascript';
import langJson from '@shikijs/langs/json';
import langJsx from '@shikijs/langs/jsx';
import langTsx from '@shikijs/langs/tsx';
import langTs from '@shikijs/langs/typescript';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

import { seedcordBrandDark, seedcordBrandLight } from './brandTheme';

import type { BundledLanguage, ShikiTransformer } from 'shiki';

const THEMES = {
    light: 'seedcord-light',
    dark: 'seedcord-dark'
} as const satisfies Record<'light' | 'dark', string>;

export interface CodeLink {
    name: string;
    href: string;
    start: number;
    end: number;
    // undefined falls back to the href protocol in applyLinkMarkers
    external?: boolean;
}

// listing the langs and themes here keeps the standalone trace down to what's below. oniguruma matches
// the tokenization the transformers were written against.
let highlighterPromise: Promise<HighlighterCore> | null = null;
function ensureHighlighter(): Promise<HighlighterCore> {
    highlighterPromise ??= createHighlighterCore({
        themes: [seedcordBrandLight, seedcordBrandDark],
        langs: [langTs, langTsx, langJs, langJsx, langJson, langBash],
        engine: createOnigurumaEngine(import('shiki/wasm'))
    });
    return highlighterPromise;
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

// refs are woven in as PUA unicode sentinels (U+E000 range). shiki's decorations API requires
// token-boundary alignment the TS grammar doesn't always give (a return-type `: Foo` tokenizes as one
// segment). the grammar treats the sentinels as identifier-continuation chars, and a post-render pass
// swaps them for `<a href>`. the layout per ref is `<OPEN><index><BOUND>name<CLOSE><index><BOUND>`,
// which lets one regex pull out the index and the content together.

// macos font fallback maps the U+E000 range onto apple's private glyphs, so raw literals here would
// render as dock and imessage icons in an editor
const LINK_OPEN = '\uE000';
const LINK_OPEN_BOUND = '\uE001';
const LINK_CLOSE = '\uE002';
const LINK_CLOSE_BOUND = '\uE003';
const INDEX_BASE = 0xe1_00;
const SENTINEL_MIN = 0xe0_00;
const SENTINEL_MAX = 0xe1_ff;
const HEX_RADIX = 16;
const DECIMAL_RADIX = 10;

function escapeRegex(value: string): string {
    return RegExp.escape(value);
}

function escapeHtmlAttr(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

interface SentinelLink {
    open: string;
    close: string;
    href: string;
}

// shiki writes the PUA chars out as numeric entities. decode first.
function normalizeSentinels(html: string): string {
    return html.replaceAll(/&#(x?)([0-9a-fA-F]+);/g, (match, isHex: string, value: string) => {
        const code = Number.parseInt(value, isHex ? HEX_RADIX : DECIMAL_RADIX);
        if (Number.isNaN(code)) return match;
        if (code >= SENTINEL_MIN && code <= SENTINEL_MAX) return String.fromCharCode(code);
        return match;
    });
}

function instrumentLinks(code: string, links: readonly CodeLink[]): { code: string; markers: SentinelLink[] } {
    if (links.length === 0) return { code, markers: [] };

    // Sorted by start so the cursor advance below stays left-to-right.
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
    // shiki sometimes tokenizes a lone sentinel into a span of its own, which leaves the open/close
    // regex below nothing to match until the span is unwrapped
    result = result.replaceAll(/<span[^>]*>\s*([-])\s*<\/span>/g, '$1');

    for (let i = 0; i < markers.length; i += 1) {
        const marker = markers[i];
        const link = links[i];
        if (!marker || !link) continue;
        const opensNewTab = link.external ?? EXTERNAL_URL_RE.test(link.href);
        const attrs = opensNewTab ? ' target="_blank" rel="noreferrer noopener"' : '';
        const pattern = new RegExp(String.raw`${escapeRegex(marker.open)}([\s\S]*?)${escapeRegex(marker.close)}`, 'g');
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
        const root = codeEl as HastElement;
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
        const root = codeEl as HastElement;
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

// shiki's dual-theme mode (`themes: {…}` + `defaultColor: false`) breaks in safari, because webkit
// does not resolve a span's `color: var(--shiki-dark)` against an inline custom property on that same
// span. rendering once per theme gives each `<pre>` a resolved `color:#X`, and globals.css switches
// the `shiki-light`/`shiki-dark` pair by visibility.

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
    const highlighter = await ensureHighlighter();
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

// shiki reads `extends` inside `<T extends X>` as a keyword only with a statement-context anchor in
// front of it, hence the function wrap. a `class _ {…}` wrap also breaks multi-line type-param
// constraints.
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

// `protected` and `readonly` enter storage.modifier scope only inside a class body
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

// a type-param row like `TPluggableEvents extends X = Y` goes through `type _<row> = unknown` because
// shiki tokenizes `<X extends Y = Z>` only inside real generic brackets, which a class-body wrap
// can't give it
const stripTypeParamWrap: ShikiTransformer = {
    name: 'seedcord-strip-type-param-wrap',
    code(codeEl) {
        const root = codeEl as HastElement;
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

// per-theme render again, same webkit reason as renderDual. globals.css switches this pair on `display`.
export async function highlightInlineToHtml(code: string, lang: BundledLanguage = 'ts'): Promise<string | null> {
    if (!code) return '';

    try {
        const highlighter = await ensureHighlighter();
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
