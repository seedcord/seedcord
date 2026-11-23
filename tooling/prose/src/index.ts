import { stringHints, strings } from '#src/rules/strings';

import type { TSESLint } from '@typescript-eslint/utils';
import type { Linter } from 'eslint';

export const prose = {
    meta: { name: '@seedcord/prose' },
    rules: { strings, 'string-hints': stringHints }
} satisfies TSESLint.FlatConfig.Plugin;

function configFor(rule: keyof typeof prose.rules, severity: 'error' | 'warn'): Linter.Config[] {
    const config: TSESLint.FlatConfig.ConfigArray = [
        {
            files: ['**/*.{ts,tsx,mts,cts}'],
            ignores: ['**/*.d.ts'],
            plugins: { prose },
            rules: { [`prose/${rule}`]: severity }
        },
        {
            files: ['**/tests/**', '**/*.test.{ts,tsx}'],
            plugins: { prose },
            // fixtures and inputs break the rules on purpose
            rules: { [`prose/${rule}`]: [severity, { only: 'test-names' }] }
        }
    ];
    // justified: typescript-eslint's FlatConfig.Config and eslint's Linter.Config describe the same runtime shape with
    // incompatible index signatures, and createConfig's userConfigs takes Linter.Config
    return config as Linter.Config[];
}

// every package's eslint config loads this, and their lint runs with --max-warnings=0
export const proseConfig = configFor('strings', 'error');
// only prose.config.ts loads this, for the edit hook. lint:prose and vp staged pass --quiet over it
export const proseHintsConfig = configFor('string-hints', 'warn');
