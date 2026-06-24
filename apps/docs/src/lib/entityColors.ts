import type { EntityTone } from '@seedcord/docs-engine/client';

// hardcoded from styles/tokens.css because viewport themeColor and Satori OG images can't read CSS variables
export const ENTITY_TONE_HEX = {
    class: { light: '#cf4329', dark: '#f0573a' },
    interface: { light: '#cb7016', dark: '#f0913f' },
    type: { light: '#a8841a', dark: '#e6c24f' },
    function: { light: '#3f7d2e', dark: '#5fb05a' },
    enum: { light: '#c23a55', dark: '#e34d6a' },
    variable: { light: '#6f8a2e', dark: '#9fc24a' }
} as const satisfies Record<EntityTone, { light: string; dark: string }>;

// the page foreground (--color-text), used as the theme-color on non-entity pages (root, overview, 404)
export const FOREGROUND_HEX = { light: '#2d3328', dark: '#f8f6e8' } as const;
