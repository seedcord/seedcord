// Named warm code palette. Each hue has a dark value and a deeper light value.
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

const CORAL = '#ea8568';
const CORAL_DEEP = '#bf5a3c';

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
    type: 'dark' | 'light';
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
        }
    ];
}

function buildTheme(name: string, type: 'dark' | 'light', p: BrandPalette): BrandTheme {
    return {
        name,
        type,
        colors: { 'editor.background': p.bg, 'editor.foreground': p.fg },
        settings: buildSettings(p)
    };
}

export const seedcordBrandDark = buildTheme('seedcord-dark', 'dark', {
    bg: SEED_DARK,
    fg: CREAM,
    comment: SAGE,
    string: FLESH,
    number: AMBER,
    keyword: RIND,
    type: WHEAT,
    fn: CORAL,
    decoratorAt: CLAY,
    parameter: SAND,
    variable: LINEN,
    property: TAN,
    operator: CLAY,
    punctuation: HUSK
});

export const seedcordBrandLight = buildTheme('seedcord-light', 'light', {
    bg: PITH,
    fg: INK,
    comment: SAGE_WARM,
    string: FLESH_DEEP,
    number: AMBER_DEEP,
    keyword: RIND_DEEP,
    type: WHEAT_DEEP,
    fn: CORAL_DEEP,
    decoratorAt: CLAY_DEEP,
    parameter: SAND_DEEP,
    variable: BARK,
    property: TAN_DEEP,
    operator: CLAY_DEEP,
    punctuation: HUSK_DEEP
});
