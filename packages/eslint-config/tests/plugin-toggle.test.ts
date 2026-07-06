import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import createConfig, { type SeedcordConfigOptions } from '../src/index';

import type { Linter } from 'eslint';

async function resolveRules(options: SeedcordConfigOptions, file: string): Promise<Partial<Linter.RulesRecord>> {
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

    it('registers the discordjs rules when enabled', async () => {
        const rules = await resolveRules({ registerDiscordjsPlugin: true }, 'src/example.ts');
        expect(rules['discordjs/no-mixed-message-format']).toBeDefined();
        // the resolver normalizes severities to numbers, 1 is warn
        expect(rules['discordjs/prefer-v2-component']).toEqual([1]);
    });

    it('omits the discordjs rules by default', async () => {
        const rules = await resolveRules({}, 'src/example.ts');
        expect(Object.keys(rules).filter((name) => name.startsWith('discordjs/'))).toEqual([]);
    });

    it('registers the seedcord rules when enabled', async () => {
        const rules = await resolveRules({ registerSeedcordPlugin: true }, 'src/example.ts');
        expect(rules['@seedcord/no-djs-builder-import']).toBeDefined();
        // the seedcord toggle registers only its own plugin, the discordjs one stays separate
        expect(Object.keys(rules).filter((name) => name.startsWith('discordjs/'))).toEqual([]);
    });

    it('omits the seedcord rules by default', async () => {
        const rules = await resolveRules({}, 'src/example.ts');
        expect(Object.keys(rules).filter((name) => name.startsWith('@seedcord/'))).toEqual([]);
    });

    it('registers both plugins together', async () => {
        const rules = await resolveRules(
            { registerDiscordjsPlugin: true, registerSeedcordPlugin: true },
            'src/example.ts'
        );
        expect(rules['discordjs/no-mixed-message-format']).toBeDefined();
        expect(rules['@seedcord/no-djs-builder-import']).toBeDefined();
    });

    it('keeps the typescript rules when tsdoc is disabled', async () => {
        const rules = await resolveRules({ registerTsdocPlugin: false }, 'src/example.ts');
        expect(rules['@typescript-eslint/no-deprecated']).toBeDefined();
        expect(rules['tsdoc/syntax']).toBeUndefined();
    });
});
