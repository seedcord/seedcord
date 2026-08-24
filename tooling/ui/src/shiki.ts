import langBash from '@shikijs/langs/bash';
import langJs from '@shikijs/langs/javascript';
import langJson from '@shikijs/langs/json';
import langJsx from '@shikijs/langs/jsx';
import langTsx from '@shikijs/langs/tsx';
import langTs from '@shikijs/langs/typescript';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

import { seedcordBrandDark, seedcordBrandLight } from './brandTheme';

import type { BundledLanguage, DecorationItem, ShikiTransformer } from 'shiki';

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
    // undefined falls back to the href protocol
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

const EXTERNAL_URL_RE = /^https?:\/\//i;

const NEW_TAB = { target: '_blank', rel: ['noreferrer', 'noopener'] };

// transformerDecorations splits a token at any offset, so a link inside `: Foo` gets its own anchor
function toDecorations(links: readonly CodeLink[]): DecorationItem[] {
    return links.map((link) => ({
        start: link.start,
        end: link.end,
        tagName: 'a',
        properties: {
            href: link.href,
            ...((link.external ?? EXTERNAL_URL_RE.test(link.href)) && NEW_TAB)
        }
    }));
}

// each token carries `color: light-dark(light, dark)`. shiki.css has the pre-2024 fallback
async function render(
    code: string,
    links: readonly CodeLink[],
    lang: BundledLanguage,
    transformers: ShikiTransformer[] = [],
    grammarContextCode?: string
): Promise<string> {
    const highlighter = await ensureHighlighter();

    return highlighter.codeToHtml(code, {
        lang,
        transformers,
        themes: THEMES,
        defaultColor: 'light-dark()',
        decorations: toDecorations(links),
        ...(!(grammarContextCode === undefined) && { grammarContextCode })
    });
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
        return await render(code, links, lang, transformers);
    } catch (error) {
        if (throwOnFailure) throw error;
        return null;
    }
}

// shiki reads `extends` inside `<T extends X>` as a keyword only with a statement in front of it
export async function highlightSignatureToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, links, 'ts', [], 'function ');
    } catch {
        return null;
    }
}

// `protected` and `readonly` enter storage.modifier scope only inside a class body
export async function highlightMemberToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, links, 'ts', [], 'class _ { ');
    } catch {
        return null;
    }
}

// `<X extends Y = Z>` only tokenizes inside real generic brackets
export async function highlightTypeParamToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, links, 'ts', [], 'type _<');
    } catch {
        return null;
    }
}

export async function highlightInlineToHtml(code: string, lang: BundledLanguage = 'ts'): Promise<string | null> {
    if (!code) return '';

    try {
        const highlighter = await ensureHighlighter();
        const tokens = highlighter.codeToHtml(code, {
            lang,
            themes: THEMES,
            defaultColor: 'light-dark()',
            structure: 'inline'
        });

        return `<code class="shiki-inline">${tokens}</code>`;
    } catch {
        return null;
    }
}
