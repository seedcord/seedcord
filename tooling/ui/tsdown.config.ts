import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: [
        'src/index.ts',
        'src/agents.ts',
        'src/sites.ts',
        'src/staticExport.ts',
        'src/PageAsset.ts',
        'src/og.ts',
        'src/palette.ts',
        'src/skills.ts',
        'src/skills/seedcord.ts',
        'src/MaterwelonGlyph.tsx',
        'src/MaterwelonFavicon.tsx',
        'src/Materwelon.tsx',
        'src/OgCard.tsx',
        'src/shiki.ts',
        'src/LinkPreview.tsx'
    ],
    format: ['esm'],
    platform: 'neutral',
    shims: false,
    target: 'esnext',
    dts: true,
    unbundle: true
});
