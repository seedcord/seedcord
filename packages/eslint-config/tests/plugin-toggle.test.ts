import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import createConfig, { type CreateConfigOptions } from '../src/index';

import type { Linter } from 'eslint';

async function resolveRules(options: CreateConfigOptions, file: string): Promise<Partial<Linter.RulesRecord>> {
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: createConfig({ tsconfigRootDir: process.cwd(), ...options })
    });
    // ESLint types calculateConfigForFile as `any`, narrow it to the resolved config shape
    const config = (await eslint.calculateConfigForFile(file)) as Linter.Config;
    return config.rules ?? {};
}

describe('createConfig plugin toggles', () => {
    it('drops plugin rules when the plugin is disabled', async () => {
        // regression: a disabled plugin left its import-x/* rules in the config, so eslint threw
        // "rule not found" for the eslint-9 apps that register no import-x plugin.
        const rules = await resolveRules({ registerImportPlugin: false }, 'src/example.ts');
        expect(Object.keys(rules).filter((name) => name.startsWith('import-x/'))).toEqual([]);
    });

    it('keeps plugin rules when the plugin is enabled', async () => {
        const rules = await resolveRules({ registerImportPlugin: true }, 'src/example.ts');
        expect(rules['import-x/order']).toBeDefined();
    });
});
