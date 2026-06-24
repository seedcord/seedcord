import { seedcordBrandDark, seedcordBrandLight } from '@seedcord/ui';
import langTs from '@shikijs/langs/typescript';
import themeLatte from '@shikijs/themes/catppuccin-latte';
import themeMacchiato from '@shikijs/themes/catppuccin-macchiato';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

let highlighterPromise: Promise<HighlighterCore> | null = null;

function ensureHighlighter(): Promise<HighlighterCore> {
    highlighterPromise ??= createHighlighterCore({
        themes: [themeLatte, themeMacchiato, seedcordBrandLight, seedcordBrandDark],
        langs: [langTs],
        engine: createOnigurumaEngine(import('shiki/wasm'))
    });
    return highlighterPromise;
}

function decorate(html: string, variant: 'light' | 'dark'): string {
    return html.replace('<pre class="shiki', `<pre class="shiki shiki-${variant}`);
}

async function renderGroup(code: string, light: string, dark: string): Promise<string> {
    const highlighter = await ensureHighlighter();
    const lightHtml = decorate(highlighter.codeToHtml(code, { lang: 'ts', theme: light }), 'light');
    const darkHtml = decorate(highlighter.codeToHtml(code, { lang: 'ts', theme: dark }), 'dark');
    return `<div class="shiki-theme-group">${lightHtml}${darkHtml}</div>`;
}

export function renderCatppuccin(code: string): Promise<string> {
    return renderGroup(code, 'catppuccin-latte', 'catppuccin-macchiato');
}

export function renderSeedcord(code: string): Promise<string> {
    return renderGroup(code, 'seedcord-light', 'seedcord-dark');
}
