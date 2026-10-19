import { OxfmtConfig } from 'vite-plus/fmt';

export const OXFMT_CONFIG: OxfmtConfig = {
    ignorePatterns: [
        'node_modules/**',
        '.eslintcache',
        '.eslintrc.js',
        '.env',
        'turbo/generators/templates/**',
        'cli/create-seedcord/templates/**',
        '**/.next/**',
        '**/dist/**',
        '**/.turbo/**',
        '**/coverage/**',
        'pnpm-lock.yaml',
        '**/seedcord-gen.d.ts',
        '**/.seedcord/**',
        '**/.cloudflare/**',
        '**/.wrangler/**',
        '**/worker-configuration.d.ts'
    ],
    tabWidth: 4,
    semi: true,
    singleQuote: true,
    trailingComma: 'none',
    printWidth: 120,
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'lf',
    useTabs: false,
    quoteProps: 'as-needed',
    bracketSameLine: false,
    proseWrap: 'never'
};
