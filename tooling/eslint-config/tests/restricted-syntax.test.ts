import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import createConfig from '#src/index';

import type { Linter } from 'eslint';

async function resolveRules(file: string): Promise<Partial<Linter.RulesRecord>> {
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: createConfig({ tsconfigRootDir: process.cwd() })
    });
    // ESLint types calculateConfigForFile as `any`, narrow it to the resolved config shape
    const config = (await eslint.calculateConfigForFile(file)) as Linter.Config;
    return config.rules ?? {};
}

describe('createConfig no-restricted-syntax', () => {
    it('keeps the TypeScript bans (inline import types, double casts) on .ts files', async () => {
        const rule = (await resolveRules('src/example.ts'))['no-restricted-syntax'];
        const options = (Array.isArray(rule) ? rule.slice(1) : []) as (string | { selector: string })[];
        const selectors = options.map((entry) => (typeof entry === 'string' ? entry : entry.selector));

        expect(selectors).toContain('TSImportType');
        expect(selectors.some((selector) => selector.includes('TSAsExpression'))).toBe(true);
    });

    it('turns the ban off for .test.tsx files, since tests may use fixture casts', async () => {
        const rule = (await resolveRules('tests/example.test.tsx'))['no-restricted-syntax'];
        const severity = Array.isArray(rule) ? rule[0] : rule;
        expect([0, 'off']).toContain(severity);
    });
});
