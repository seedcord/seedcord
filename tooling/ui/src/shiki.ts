import langBash from '@shikijs/langs/bash';
import langJs from '@shikijs/langs/javascript';
import langJson from '@shikijs/langs/json';
import langJsx from '@shikijs/langs/jsx';
import langToml from '@shikijs/langs/toml';
import langTsx from '@shikijs/langs/tsx';
import langTs from '@shikijs/langs/typescript';
import langYaml from '@shikijs/langs/yaml';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

import { seedcordBrandDark, seedcordBrandLight } from './brandTheme';
import { langHandlebars } from './langHandlebars';

import type { DecorationItem, ShikiTransformer } from 'shiki';

const THEMES = {
    light: 'seedcord-light',
    dark: 'seedcord-dark'
} as const satisfies Record<'light' | 'dark', string>;

// shiki registers the bash grammar under all four names
const SHELLS = ['bash', 'sh', 'shell', 'zsh'] as const;

// shiki registers each grammar under its full name and its short alias. txt needs no grammar, shiki special-cases it
const HIGHLIGHTABLE = [
    'ts',
    'typescript',
    'tsx',
    'js',
    'javascript',
    'jsx',
    'json',
    'yaml',
    'yml',
    'toml',
    'hbs',
    ...SHELLS,
    'txt',
    'text',
    'plaintext'
] as const;

export type HighlightLanguage = (typeof HIGHLIGHTABLE)[number];

const HIGHLIGHTABLE_SET: ReadonlySet<string> = new Set(HIGHLIGHTABLE);
const SHELL_SET: ReadonlySet<string> = new Set(SHELLS);

export const isShellLanguage = (lang: string): boolean => SHELL_SET.has(lang);

export function isHighlightable(lang: string): lang is HighlightLanguage {
    return HIGHLIGHTABLE_SET.has(lang);
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
        langs: [langTs, langTsx, langJs, langJsx, langJson, langYaml, langToml, langHandlebars, langBash],
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

const DARK_THEME = { theme: THEMES.dark } as const;
// each token carries `color: light-dark(light, dark)`. shiki.css has the pre-2024 fallback
const BOTH_THEMES = { themes: THEMES, defaultColor: 'light-dark()' } as const;

interface RenderOptions {
    links?: readonly CodeLink[];
    lang?: HighlightLanguage;
    transformers?: ShikiTransformer[];
    grammarContextCode?: string;
    colors?: typeof BOTH_THEMES | typeof DARK_THEME;
}

async function render(
    code: string,
    { links = [], lang = 'ts', transformers = [], grammarContextCode, colors = BOTH_THEMES }: RenderOptions
): Promise<string> {
    const highlighter = await ensureHighlighter();

    return highlighter.codeToHtml(code, {
        lang,
        transformers,
        ...colors,
        decorations: toDecorations(links),
        ...(!(grammarContextCode === undefined) && { grammarContextCode })
    });
}

interface HighlightOptions {
    links?: readonly CodeLink[] | undefined;
    transformers?: ShikiTransformer[] | undefined;
    throwOnFailure?: boolean | undefined;
    onlyDark?: boolean | undefined;
}

export async function highlightToHtml(
    code: string,
    lang: HighlightLanguage,
    options: HighlightOptions & { throwOnFailure: true }
): Promise<string>;
export async function highlightToHtml(
    code: string,
    lang?: HighlightLanguage,
    options?: HighlightOptions
): Promise<string | null>;
export async function highlightToHtml(
    code: string,
    lang: HighlightLanguage = 'ts',
    { links = [], transformers = [], throwOnFailure = false, onlyDark = false }: HighlightOptions = {}
): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, { links, lang, transformers, colors: onlyDark ? DARK_THEME : BOTH_THEMES });
    } catch (error) {
        if (throwOnFailure) throw error;
        return null;
    }
}

export async function highlightFenceToHtml(code: string, tag: string): Promise<string | null> {
    if (!code) return '';

    const lang = tag === '' ? 'ts' : tag;
    return isHighlightable(lang) ? highlightToHtml(code, lang) : null;
}

// shiki reads `extends` inside `<T extends X>` as a keyword only with a statement in front of it
export async function highlightSignatureToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, { links, grammarContextCode: 'function ' });
    } catch {
        return null;
    }
}

// `protected` and `readonly` enter storage.modifier scope only inside a class body
export async function highlightMemberToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, { links, grammarContextCode: 'class _ { ' });
    } catch {
        return null;
    }
}

// `<X extends Y = Z>` only tokenizes inside real generic brackets
export async function highlightTypeParamToHtml(code: string, links: readonly CodeLink[] = []): Promise<string | null> {
    if (!code) return '';

    try {
        return await render(code, { links, grammarContextCode: 'type _<' });
    } catch {
        return null;
    }
}

export async function highlightInlineToHtml(code: string, lang: HighlightLanguage = 'ts'): Promise<string | null> {
    if (!code) return '';

    try {
        const highlighter = await ensureHighlighter();
        const tokens = highlighter.codeToHtml(code, {
            lang,
            ...BOTH_THEMES,
            structure: 'inline'
        });

        return `<code class="shiki-inline">${tokens}</code>`;
    } catch {
        return null;
    }
}
