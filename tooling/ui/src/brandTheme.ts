import { BRAND } from './palette';

// the light theme takes the darker value of each pair, since it renders on cream
const HUES = {
    ground: { dark: BRAND.seedDark, light: BRAND.pith },
    text: { dark: '#f4f0df', light: '#3a4233' },
    comment: { dark: '#7d8675', light: '#8a9079' },
    linen: { dark: '#ecebd9', light: '#4a5142' },
    rind: { dark: BRAND.rind, light: '#3f7d2e' },
    // the brand red also paints an error card and the danger callout
    teal: { dark: '#5fb3ab', light: '#2f7b76' },
    amber: { dark: '#e3b552', light: '#a8781a' },
    coral: { dark: '#ea8568', light: '#bf5a3c' },
    wheat: { dark: '#ead98a', light: '#7a651c' },
    sand: { dark: '#d8c8a4', light: '#6a5f44' },
    tan: { dark: '#c9bb96', light: '#7a6a45' },
    clay: { dark: '#b89a6a', light: '#8a6d3f' },
    husk: { dark: '#9aa089', light: '#6b7363' }
} as const;

type ThemeMode = 'dark' | 'light';

interface BrandPalette {
    bg: string;
    fg: string;
    comment: string;
    string: string;
    number: string;
    keyword: string;
    type: string;
    fn: string;
    decoratorAt: string;
    parameter: string;
    variable: string;
    property: string;
    operator: string;
    punctuation: string;
}

interface BrandThemeSetting {
    scope: string[];
    settings: { foreground: string; fontStyle?: string };
}

interface BrandTheme {
    name: string;
    type: ThemeMode;
    colors: Record<string, string>;
    settings: BrandThemeSetting[];
}

function buildSettings(p: BrandPalette): BrandThemeSetting[] {
    return [
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
            settings: { foreground: p.number }
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
            settings: { foreground: p.keyword }
        },
        { scope: ['keyword.operator'], settings: { foreground: p.operator } },
        { scope: ['entity.name.type', 'support.type'], settings: { foreground: p.type, fontStyle: 'italic' } },
        {
            scope: [
                'entity.name.class',
                'entity.name.type.class',
                'entity.name.type.interface',
                'entity.other.inherited-class',
                'support.class'
            ],
            settings: { foreground: p.type, fontStyle: 'bold italic' }
        },
        { scope: ['punctuation.decorator'], settings: { foreground: p.decoratorAt } },
        {
            scope: ['meta.decorator entity.name.function', 'entity.name.function.decorator'],
            settings: { foreground: p.fn, fontStyle: 'bold' }
        },
        {
            scope: [
                'entity.name.function',
                'support.function',
                'meta.function-call entity.name.function',
                'variable.function'
            ],
            settings: { foreground: p.fn, fontStyle: 'italic' }
        },
        { scope: ['variable.parameter'], settings: { foreground: p.parameter, fontStyle: 'italic' } },
        { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: p.variable } },
        {
            scope: ['meta.object-literal.key', 'variable.other.property', 'support.variable.property'],
            settings: { foreground: p.property }
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
        },
        {
            scope: ['meta.type.tuple meta.brace.square'],
            settings: { foreground: p.type, fontStyle: 'italic' }
        },
        {
            scope: ['meta.type variable.other'],
            settings: { foreground: p.type, fontStyle: 'italic' }
        }
    ];
}

function palette(mode: ThemeMode): BrandPalette {
    return {
        bg: HUES.ground[mode],
        fg: HUES.text[mode],
        comment: HUES.comment[mode],
        string: HUES.teal[mode],
        number: HUES.amber[mode],
        keyword: HUES.rind[mode],
        type: HUES.wheat[mode],
        fn: HUES.coral[mode],
        decoratorAt: HUES.clay[mode],
        parameter: HUES.sand[mode],
        variable: HUES.linen[mode],
        property: HUES.tan[mode],
        operator: HUES.clay[mode],
        punctuation: HUES.husk[mode]
    };
}

function buildTheme(name: string, mode: ThemeMode): BrandTheme {
    const p = palette(mode);
    return {
        name,
        type: mode,
        colors: { 'editor.background': p.bg, 'editor.foreground': p.fg },
        settings: buildSettings(p)
    };
}

export const seedcordBrandDark = buildTheme('seedcord-dark', 'dark');
export const seedcordBrandLight = buildTheme('seedcord-light', 'light');
