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
        engine: createOnigurumaEngine(import('shiki/wasm'))
    });
    return highlighterPromise;
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
    transformers: ShikiTransformer[] = [],
    grammarContextCode?: string
): Promise<string> {
    const highlighter = await ensureHighlighter();
    const shared = { lang, transformers, ...(!(grammarContextCode === undefined) && { grammarContextCode }) };
    const lightRaw = decorateBlock(highlighter.codeToHtml(instrumented, { ...shared, theme: THEMES.light }), 'light');
    const darkRaw = decorateBlock(highlighter.codeToHtml(instrumented, { ...shared, theme: THEMES.dark }), 'dark');
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

// shiki reads `extends` inside `<T extends X>` as a keyword only with a statement in front of it
export async function highlightSignatureToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        const { code: instrumented, markers } = instrumentLinks(code, links);
        return await renderDual(instrumented, markers, 'ts', [], 'function ');
    } catch {
        return null;
    }
}

// `protected` and `readonly` enter storage.modifier scope only inside a class body
export async function highlightMemberToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        const { code: instrumented, markers } = instrumentLinks(code, links);
        return await renderDual(instrumented, markers, 'ts', [], 'class _ { ');
    } catch {
        return null;
    }
}

// `<X extends Y = Z>` only tokenizes inside real generic brackets
export async function highlightTypeParamToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        const { code: instrumented, markers } = instrumentLinks(code, links);
        return await renderDual(instrumented, markers, 'ts', [], 'type _<');
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
