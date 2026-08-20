import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: [
        'src/index.ts',
        'src/og.ts',
        'src/palette.ts',
        'src/MaterwelonGlyph.tsx',
        'src/MaterwelonFavicon.tsx',
        'src/Materwelon.tsx',
        'src/OgCard.tsx',
        'src/shiki.ts'
    ],
    format: ['esm'],
    platform: 'neutral',
    shims: false,
    target: 'esnext',
    dts: true,
    unbundle: true,
    deps: {
        skipNodeModulesBundle: true,
        neverBundle: [
            '@shikijs/langs',
            'shiki',
            '@radix-ui/react-popover',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            'clsx',
            'lucide-react',
            'motion',
            'react',
            'react-dom',
            'tailwind-merge'
        ]
    }
});
