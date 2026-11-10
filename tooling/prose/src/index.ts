import { strings } from '#src/rules/strings';

import type { TSESLint } from '@typescript-eslint/utils';
import type { Linter } from 'eslint';

export const prose = {
    meta: { name: '@seedcord/prose' },
    rules: { strings }
} satisfies TSESLint.FlatConfig.Plugin;

const config: TSESLint.FlatConfig.ConfigArray = [
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        ignores: ['**/*.d.ts'],
        plugins: { prose },
        rules: { 'prose/strings': 'error' }
    },
    {
        files: ['**/tests/**', '**/*.test.{ts,tsx}'],
        plugins: { prose },
        // fixtures and inputs break the rules on purpose
        rules: { 'prose/strings': ['error', { only: 'test-names' }] }
    }
];

// justified: typescript-eslint's FlatConfig.Config and eslint's Linter.Config describe the same runtime shape with
// incompatible index signatures, and createConfig's userConfigs takes Linter.Config
export const proseConfig = config as Linter.Config[];
