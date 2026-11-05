import { defineConfig } from 'vite-plus';

import { runEslint } from './scripts/src/lint-staged.ts';

export default defineConfig({
    staged: {
        // this will become 'vp check --fix --no-error-on-unmatched-pattern'
        // once eslint has been replaced with oxlint
        '*': 'vp fmt --no-error-on-unmatched-pattern',
        '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint
    },
    fmt: {
        ignorePatterns: [
            'node_modules/**',
            '.eslintcache',
            '.eslintrc.js',
            '.env',
            // prettier reads .hbs as an html template, and these hold typescript and markdown
            '*.hbs',
            '**/.next/**',
            '**/dist/**',
            '**/.turbo/**',
            '**/coverage/**',
            'pnpm-lock.yaml',
            '**/seedcord-gen.ts',
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
        proseWrap: 'never',
        overrides: [
            {
                files: ['*.{yml,yaml}'],
                options: { tabWidth: 2 }
            },
            {
                files: ['tooling/ui/**/*.{ts,tsx,json,md,css}'],
                options: {
                    sortTailwindcss: {
                        stylesheet: './tooling/ui/src/styles/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                files: ['apps/docs/**/*.{ts,tsx,json,md,css}'],
                options: {
                    sortTailwindcss: {
                        stylesheet: './apps/docs/src/app/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                files: ['apps/home/**/*.{ts,tsx,json,md,css}'],
                options: {
                    sortTailwindcss: {
                        stylesheet: './apps/home/src/app/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                files: ['apps/guide/**/*.{ts,tsx,json,md,css}'],
                options: {
                    sortTailwindcss: {
                        stylesheet: './apps/guide/src/app/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                // 68 characters is what the 680px code column fits at the 1280px shell
                files: ['apps/guide/content/**/*.mdx'],
                options: { printWidth: 68 }
            }
        ]
    }
});
