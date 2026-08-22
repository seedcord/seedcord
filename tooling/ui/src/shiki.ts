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

// shiki registers each grammar under its full name and its short alias
const HIGHLIGHTABLE = new Set(['ts', 'typescript', 'tsx', 'js', 'javascript', 'jsx', 'json', 'bash']);

export function isHighlightable(lang: string): lang is BundledLanguage {
    return HIGHLIGHTABLE.has(lang);
}

export interface CodeLink {
    name: string;
    href: string;
    start: number;
    end: number;
    // undefined falls back to the href protocol in instrumentLinks
    external?: boolean;
}

let highlighterPromise: Promise<HighlighterCore> | null = null;
function ensureHighlighter(): Promise<HighlighterCore> {
    highlighterPromise ??= createHighlighterCore({
        themes: [seedcordBrandLight, seedcordBrandDark],
        langs: [langTs, langTsx, langJs, langJsx, langJson, langBash],
        // the transformers below were written against oniguruma's tokenization
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

// shiki's decorations API needs token boundaries the TS grammar doesn't give (a return type `: Foo`
// tokenizes as one segment). the U+E000 sentinels below wrap a link range and survive tokenization
// because the grammar reads them as identifier continuations.

// a raw literal from that range renders as one of apple's private glyphs in a macos editor
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
    opensNewTab: boolean;
}

const EXTERNAL_URL_RE = /^https?:\/\//i;

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

    // sorted by start because the cursor below only moves forward
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
        markers.push({
            open,
            close,
            href: escapeHtmlAttr(link.href),
            opensNewTab: link.external ?? EXTERNAL_URL_RE.test(link.href)
        });

        result += code.slice(cursor, link.start);
        result += open;
        result += code.slice(link.start, link.end);
        result += close;
        cursor = link.end;
    }
    result += code.slice(cursor);
    return { code: result, markers };
}

function applyLinkMarkers(html: string, markers: readonly SentinelLink[]): string {
    if (markers.length === 0) return html;

    let result = normalizeSentinels(html);

    for (const marker of markers) {
        const attrs = marker.opensNewTab ? ' target="_blank" rel="noreferrer noopener"' : '';
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

// safari breaks shiki's dual-theme mode (`themes: {…}` + `defaultColor: false`) because webkit does
// not resolve a span's `color: var(--shiki-dark)` against an inline custom property on that same span.
// globals.css switches the rendered pair by visibility.

function decorateBlock(html: string, variant: 'light' | 'dark'): string {
    return html.replace('<pre class="shiki', `<pre class="shiki shiki-${variant}`);
}

async function renderDual(
    instrumented: string,
    markers: readonly SentinelLink[],
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
    const light = applyLinkMarkers(lightRaw, markers);
    const dark = applyLinkMarkers(darkRaw, markers);
    return `<div class="shiki-theme-group">${light}${dark}</div>`;
}

interface HighlightOptions {
    links?: readonly CodeLink[] | undefined;
    transformers?: ShikiTransformer[] | undefined;
    throwOnFailure?: boolean | undefined;
}

export async function highlightToHtml(
    code: string,
    lang: BundledLanguage = 'ts',
    { links = [], transformers = [], throwOnFailure = false }: HighlightOptions = {}
): Promise<string | null> {
    if (!code) return '';

    try {
        const { code: instrumented, markers } = instrumentLinks(code, links);
        return await renderDual(instrumented, markers, lang, transformers);
    } catch (error) {
        if (throwOnFailure) throw error;
        return null;
    }
}

// shiki reads `extends` inside `<T extends X>` as a keyword only with a statement in front of it. a
// `class _ {…}` wrap breaks multi-line type-param constraints.
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
        return await renderDual(instrumented, markers, 'ts', [stripFunctionWrap]);
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
        return await renderDual(instrumented, markers, 'ts', [stripMemberWrap]);
    } catch {
        return null;
    }
}

// `<X extends Y = Z>` only tokenizes inside real generic brackets
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
        return await renderDual(instrumented, markers, 'ts', [stripTypeParamWrap]);
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
