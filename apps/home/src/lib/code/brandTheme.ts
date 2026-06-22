import type { ThemeRegistrationRaw } from 'shiki';

interface BrandPalette {
    bg: string;
    fg: string;
    comment: string;
    string: string;
    keyword: string;
    type: string;
    func: string;
    variable: string;
    punctuation: string;
}

function buildTheme(name: string, type: 'dark' | 'light', p: BrandPalette): ThemeRegistrationRaw {
    return {
        name,
        type,
        colors: { 'editor.background': p.bg, 'editor.foreground': p.fg },
        settings: [
            {
                scope: ['comment', 'punctuation.definition.comment'],
                settings: { foreground: p.comment, fontStyle: 'italic' }
            },
            {
                scope: ['string', 'string.template', 'punctuation.definition.string', 'constant.other.symbol'],
                settings: { foreground: p.string }
            },
            {
                scope: ['constant.numeric', 'constant.language', 'constant.language.boolean', 'keyword.other.unit'],
                settings: { foreground: p.string }
            },
            {
                scope: [
                    'keyword',
                    'storage',
                    'storage.type',
                    'storage.modifier',
                    'keyword.operator.new',
                    'keyword.operator.expression'
                ],
                settings: { foreground: p.keyword }
            },
            {
                scope: [
                    'entity.name.type',
                    'entity.name.class',
                    'support.type',
                    'support.class',
                    'entity.other.inherited-class'
                ],
                settings: { foreground: p.type, fontStyle: 'bold' }
            },
            {
                scope: [
                    'meta.decorator',
                    'meta.decorator punctuation.decorator',
                    'meta.decorator entity.name.function',
                    'entity.name.function.decorator'
                ],
                settings: { foreground: p.type, fontStyle: 'bold' }
            },
            {
                scope: [
                    'entity.name.function',
                    'support.function',
                    'meta.function-call entity.name.function',
                    'variable.function'
                ],
                settings: { foreground: p.func }
            },
            {
                scope: [
                    'variable',
                    'variable.other',
                    'variable.parameter',
                    'meta.definition.variable',
                    'meta.object-literal.key'
                ],
                settings: { foreground: p.variable }
            },
            {
                scope: [
                    'punctuation',
                    'meta.brace',
                    'punctuation.accessor',
                    'punctuation.separator',
                    'punctuation.terminator'
                ],
                settings: { foreground: p.punctuation }
            }
        ]
    };
}

export const seedcordBrandDark = buildTheme('seedcord-dark', 'dark', {
    bg: '#2d3328',
    fg: '#f8f6e8',
    comment: '#7d8675',
    string: '#f04e36',
    keyword: '#6fab49',
    type: '#f8f6e8',
    func: '#f8f6e8',
    variable: '#ecebd9',
    punctuation: '#9aa089'
});

// deeper red/green so it reads on the warm-light code surface
export const seedcordBrandLight = buildTheme('seedcord-light', 'light', {
    bg: '#f4f1e3',
    fg: '#3a4233',
    comment: '#8a9079',
    string: '#c4452c',
    keyword: '#3f7d2e',
    type: '#2d3328',
    func: '#3a4233',
    variable: '#4a5142',
    punctuation: '#6b7363'
});
