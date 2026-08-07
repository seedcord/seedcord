import langTs from '@shikijs/langs/typescript';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

import type { ThemeRegistrationRaw } from 'shiki';

// each named hue below pairs a dark-mode value with a deeper light-mode value
const SEED_DARK = '#2d3328';
const PITH = '#f4f1e3';

const CREAM = '#f4f0df';
const INK = '#3a4233';

const RIND = '#6fab49';
const RIND_DEEP = '#3f7d2e';

const FLESH = '#f04e36';
const FLESH_DEEP = '#c4452c';

const AMBER = '#e3b552';
const AMBER_DEEP = '#a8781a';

const EMBER = '#ef9355';
const EMBER_DEEP = '#c2682f';

const WHEAT = '#ead98a';
const WHEAT_DEEP = '#7a651c';

const SAND = '#d8c8a4';
const SAND_DEEP = '#6a5f44';

const LINEN = '#ecebd9';
const BARK = '#4a5142';

const TAN = '#c9bb96';
const TAN_DEEP = '#7a6a45';

const CLAY = '#b89a6a';
const CLAY_DEEP = '#8a6d3f';

const HUSK = '#9aa089';
const HUSK_DEEP = '#6b7363';

const SAGE = '#7d8675';
const SAGE_WARM = '#8a9079';

// the decorator @ glyph, muted so it recedes behind the decorator name right after it
const AT = CLAY;
const AT_DEEP = CLAY_DEEP;

export interface PaletteRole {
    key: string;
    label: string;
    colorName: string;
    sample: string;
    dark: string;
    light: string;
    emphasis?: 'bold' | 'italic';
}

export const PALETTE: PaletteRole[] = [
    { key: 'fg', label: 'default text', colorName: 'cream / ink', sample: 'identifier', dark: CREAM, light: INK },
    {
        key: 'keyword',
        label: 'keyword / control',
        colorName: 'rind',
        sample: 'const  return  await',
        dark: RIND,
        light: RIND_DEEP
    },
    { key: 'string', label: 'string', colorName: 'flesh', sample: "'library/search'", dark: FLESH, light: FLESH_DEEP },
    {
        key: 'number',
        label: 'number / boolean / constant',
        colorName: 'amber',
        sample: '42   1.2   true   null',
        dark: AMBER,
        light: AMBER_DEEP
    },
    {
        key: 'function',
        label: 'function call + declaration',
        colorName: 'ember',
        sample: 'getString()',
        dark: EMBER,
        light: EMBER_DEEP,
        emphasis: 'italic'
    },
    {
        key: 'type',
        label: 'type / class / interface',
        colorName: 'wheat',
        sample: 'SearchHandler  Promise',
        dark: WHEAT,
        light: WHEAT_DEEP,
        emphasis: 'italic'
    },
    {
        key: 'decorator',
        label: 'decorator name',
        colorName: 'ember',
        sample: 'SlashRoute  Gated',
        dark: EMBER,
        light: EMBER_DEEP,
        emphasis: 'bold'
    },
    { key: 'at', label: 'decorator @', colorName: 'clay (muted)', sample: '@', dark: AT, light: AT_DEEP },
    {
        key: 'parameter',
        label: 'parameter',
        colorName: 'sand',
        sample: 'items  fallback',
        dark: SAND,
        light: SAND_DEEP,
        emphasis: 'italic'
    },
    { key: 'variable', label: 'variable', colorName: 'linen / bark', sample: 'query  timer', dark: LINEN, light: BARK },
    {
        key: 'property',
        label: 'property / object key',
        colorName: 'tan',
        sample: 'token  intents',
        dark: TAN,
        light: TAN_DEEP
    },
    { key: 'operator', label: 'operator', colorName: 'clay', sample: '=>   |   &   ??', dark: CLAY, light: CLAY_DEEP },
    {
        key: 'punctuation',
        label: 'punctuation',
        colorName: 'husk',
        sample: '{ } ( ) ; , .',
        dark: HUSK,
        light: HUSK_DEEP
    },
    {
        key: 'comment',
        label: 'comment / JSDoc',
        colorName: 'sage',
        sample: '// resolves the emoji',
        dark: SAGE,
        light: SAGE_WARM,
        emphasis: 'italic'
    }
];

// function and decorator names share one hue. the orange is still undecided
export interface FunctionHue {
    key: string;
    label: string;
    dark: string;
    light: string;
}

export const FUNCTION_HUES: FunctionHue[] = [
    { key: 'ember', label: 'ember (current)', dark: EMBER, light: EMBER_DEEP },
    { key: 'terracotta', label: 'terracotta (deeper, earthier)', dark: '#db6d42', light: '#a84e28' },
    { key: 'coral', label: 'coral (softer, pinker)', dark: '#ea8568', light: '#bf5a3c' }
];

function colorOf(key: string, mode: 'dark' | 'light'): string {
    return PALETTE.find((role) => role.key === key)?.[mode] ?? '#ff00ff';
}

function buildSettings(c: (key: string) => string, fnColor: string, atColor: string): ThemeRegistrationRaw['settings'] {
    return [
        {
            scope: ['comment', 'punctuation.definition.comment'],
            settings: { foreground: c('comment'), fontStyle: 'italic' }
        },
        {
            scope: ['string', 'string.template', 'punctuation.definition.string', 'constant.other.symbol'],
            settings: { foreground: c('string') }
        },
        {
            scope: ['constant.numeric', 'constant.language', 'constant.language.boolean', 'keyword.other.unit'],
            settings: { foreground: c('number') }
        },
        {
            scope: [
                'keyword',
                'storage',
                'storage.modifier',
                'keyword.control',
                'keyword.operator.new',
                'keyword.operator.expression'
            ],
            settings: { foreground: c('keyword') }
        },
        { scope: ['keyword.operator'], settings: { foreground: c('operator') } },
        {
            scope: [
                'entity.name.type',
                'entity.name.class',
                'support.type',
                'support.class',
                'entity.other.inherited-class'
            ],
            settings: { foreground: c('type'), fontStyle: 'italic' }
        },
        { scope: ['punctuation.decorator'], settings: { foreground: atColor } },
        {
            scope: ['meta.decorator entity.name.function', 'entity.name.function.decorator'],
            settings: { foreground: fnColor, fontStyle: 'bold' }
        },
        {
            scope: [
                'entity.name.function',
                'support.function',
                'meta.function-call entity.name.function',
                'variable.function'
            ],
            settings: { foreground: fnColor, fontStyle: 'italic' }
        },
        { scope: ['variable.parameter'], settings: { foreground: c('parameter'), fontStyle: 'italic' } },
        { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: c('variable') } },
        {
            scope: ['meta.object-literal.key', 'variable.other.property', 'support.variable.property'],
            settings: { foreground: c('property') }
        },
        {
            scope: [
                'punctuation',
                'meta.brace',
                'punctuation.accessor',
                'punctuation.separator',
                'punctuation.terminator'
            ],
            settings: { foreground: c('punctuation') }
        }
    ];
}

function buildTheme(name: string, mode: 'dark' | 'light', fnDark: string, fnLight: string): ThemeRegistrationRaw {
    const c = (key: string): string => colorOf(key, mode);
    const fnColor = mode === 'dark' ? fnDark : fnLight;
    const atColor = mode === 'dark' ? AT : AT_DEEP;
    return {
        name,
        type: mode,
        colors: { 'editor.background': mode === 'dark' ? SEED_DARK : PITH, 'editor.foreground': c('fg') },
        settings: buildSettings(c, fnColor, atColor)
    };
}

const themes: ThemeRegistrationRaw[] = FUNCTION_HUES.flatMap((hue) => [
    buildTheme(`fn-${hue.key}-dark`, 'dark', hue.dark, hue.light),
    buildTheme(`fn-${hue.key}-light`, 'light', hue.dark, hue.light)
]);

let highlighterPromise: Promise<HighlighterCore> | null = null;

function ensureHighlighter(): Promise<HighlighterCore> {
    highlighterPromise ??= createHighlighterCore({
        themes,
        langs: [langTs],
        engine: createOnigurumaEngine(import('shiki/wasm'))
    });
    return highlighterPromise;
}

function decorate(html: string, variant: 'light' | 'dark'): string {
    return html.replace('<pre class="shiki', `<pre class="shiki shiki-${variant}`);
}

export async function renderHue(code: string, hueKey: string): Promise<string> {
    const highlighter = await ensureHighlighter();
    const lightHtml = decorate(highlighter.codeToHtml(code, { lang: 'ts', theme: `fn-${hueKey}-light` }), 'light');
    const darkHtml = decorate(highlighter.codeToHtml(code, { lang: 'ts', theme: `fn-${hueKey}-dark` }), 'dark');
    return `<div class="shiki-theme-group">${lightHtml}${darkHtml}</div>`;
}

export function renderProposed(code: string): Promise<string> {
    return renderHue(code, 'ember');
}
