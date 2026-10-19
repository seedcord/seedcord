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
        // importing the defaults with createOxfmtConfig() ignores that
        // templates are apart of ignorePatterns and formats them anyway
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
        proseWrap: 'never',
        overrides: [
            {
                files: ['*.yml', '*.yaml'],
                options: { tabWidth: 2 }
            },
            {
                // files: ['tooling/ui/**/*.{ts,tsx,json,md,css}'],
                files: [
                    'tooling/ui/**/*.ts',
                    'tooling/ui/**/*.tsx',
                    'tooling/ui/**/*.json',
                    'tooling/ui/**/*.md',
                    'tooling/ui/**/*.css'
                ],
                options: {
                    sortTailwindcss: {
                        stylesheet: './tooling/ui/src/styles/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                // files: ['apps/docs/**/*.{ts,tsx,json,md,css}'],
                files: [
                    'apps/docs/**/*.ts',
                    'apps/docs/**/*.tsx',
                    'apps/docs/**/*.json',
                    'apps/docs/**/*.md',
                    'apps/docs/**/*.css'
                ],
                options: {
                    sortTailwindcss: {
                        stylesheet: './apps/docs/src/app/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                // files: ['apps/home/**/*.{ts,tsx,json,md,css}'],
                files: [
                    'apps/home/**/*.ts',
                    'apps/home/**/*.tsx',
                    'apps/home/**/*.json',
                    'apps/home/**/*.md',
                    'apps/home/**/*.css'
                ],
                options: {
                    sortTailwindcss: {
                        stylesheet: './apps/home/src/app/globals.css',
                        functions: ['cn', 'tw']
                    }
                }
            },
            {
                // files: ['apps/guide/**/*.{ts,tsx,json,md,css}'],
                files: [
                    'apps/guide/**/*.ts',
                    'apps/guide/**/*.tsx',
                    'apps/guide/**/*.json',
                    'apps/guide/**/*.md',
                    'apps/guide/**/*.css'
                ],
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
