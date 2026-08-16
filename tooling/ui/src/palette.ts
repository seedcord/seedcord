// hardcoded from styles/tokens.css because Satori and Next's viewport.themeColor can't read CSS variables.
// tests/palette.test.ts asserts every value here still matches the token file.
const PITH = '#f8f6e8';
const SEED_DARK = '#2d3328';
const FLESH = '#f04e36';
const FLESH_DEEP = '#c8341f';
const RIND = '#6fab49';
const RIND_DEEP = '#4d7d33';

function withAlpha(hex: string, alpha: number): string {
    // eslint-disable-next-line no-magic-numbers -- hex color channels
    const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
    return `rgba(${channels.join(', ')}, ${alpha})`;
}

const SUB_ALPHA = 0.85;

export const BRAND = {
    pith: PITH,
    seedDark: SEED_DARK,
    flesh: FLESH,
    fleshDeep: FLESH_DEEP,
    rind: RIND,
    rindDeep: RIND_DEEP,
    // body copy on the cream ground, softened so it sits under the headline
    sub: withAlpha(SEED_DARK, SUB_ALPHA)
} as const;
