import { defineConfig } from 'vite-plus';

import { runEslint, runProse } from './scripts/src/vp-staged.ts';
import { PRETTIER_CONFIG } from './tooling/eslint-config-base/src/rules/prettier-config.ts';

export default defineConfig({
    staged: {
        '*': 'vp fmt --no-error-on-unmatched-pattern',
        '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint,
        '*.{md,mdx,ts,tsx,mts,cts,yml,yaml}': runProse
    },
    fmt: {
        ignorePatterns: [
            'node_modules/**',
            '.eslintcache',
            '.eslintrc.js',
            '.env',
            // oxfmt reads .hbs as an html template, and these hold typescript and markdown
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
        ...PRETTIER_CONFIG,
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
