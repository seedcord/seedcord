import { seedcordBrandDark, seedcordBrandLight } from '@seedcord/ui';
import { createHighlighter, type Highlighter } from 'shiki';

export type CodeLang = 'ts' | 'tsx' | 'bash';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
    highlighterPromise ??= createHighlighter({
        themes: [seedcordBrandDark, seedcordBrandLight],
        langs: ['ts', 'tsx', 'bash']
    });
    return highlighterPromise;
}

// build-time highlight, the homepage code cards are always dark
export async function highlightCode(code: string, lang: CodeLang = 'ts'): Promise<string> {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code.trim(), { lang, theme: 'seedcord-dark' });
}
