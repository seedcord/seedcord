import { createHighlighter, type Highlighter } from 'shiki';

import { seedcordBrandDark, seedcordBrandLight } from './brandTheme';

export type CodeLang = 'ts' | 'tsx' | 'bash';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
    highlighterPromise ??= createHighlighter({
        themes: [seedcordBrandDark, seedcordBrandLight],
        langs: ['ts', 'tsx', 'bash']
    });
    return highlighterPromise;
}

// build-time highlight for the homepage's always-dark code cards (docs selects seedcord-light per page mode)
export async function highlightCode(code: string, lang: CodeLang = 'ts'): Promise<string> {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code.trim(), { lang, theme: 'seedcord-dark' });
}
