import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import createConfig, { type SeedcordConfigOptions } from '#src/index';

import type { Linter } from 'eslint';

// both come from tseslint presets. only the first one reads the type checker
const TYPE_AWARE = '@typescript-eslint/no-floating-promises';
const SYNTAX_ONLY = '@typescript-eslint/consistent-type-definitions';

async function resolveConfig(options: SeedcordConfigOptions, file: string): Promise<Linter.Config> {
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: createConfig({ tsconfigRootDir: process.cwd(), ...options })
    });
    // ESLint types calculateConfigForFile as `any`, narrow it to the resolved config shape
    return (await eslint.calculateConfigForFile(file)) as Linter.Config;
}

function severity(rules: Partial<Linter.RulesRecord>, name: string): unknown {
    const entry = rules[name];
    return Array.isArray(entry) ? entry[0] : entry;
}

describe('registerTypescriptConfigs', () => {
    it('runs the type-aware rules by default', async () => {
        const { rules = {} } = await resolveConfig({}, 'src/example.ts');
        expect(severity(rules, TYPE_AWARE)).toBe(2);
    });

    it('turns off the type-aware rules on no-type-checked, keeping the rest', async () => {
        const { rules = {} } = await resolveConfig({ registerTypescriptConfigs: 'no-type-checked' }, 'src/example.ts');

        expect(severity(rules, TYPE_AWARE)).toBe(0);
        expect(severity(rules, SYNTAX_ONLY)).toBe(2);
    });

    it('keeps the parser project on no-type-checked, because the seedcord rules read types', async () => {
        const config = await resolveConfig(
            { registerTypescriptConfigs: 'no-type-checked', registerSeedcordPlugin: true },
            'src/example.ts'
        );

        const parserOptions = config.languageOptions?.parserOptions as { project?: string[] } | undefined;
        expect(parserOptions?.project).toEqual(['./tsconfig.json']);
        expect(config.rules?.['@seedcord/no-djs-builder-import']).toBeDefined();
    });

    it('leaves no typescript-eslint rule switched on for false', async () => {
        const { rules = {} } = await resolveConfig({ registerTypescriptConfigs: false }, 'src/example.ts');
        // eslint-config-prettier still names a few, all of them off
        const enabled = Object.keys(rules).filter(
            (name) => name.startsWith('@typescript-eslint/') && severity(rules, name) !== 0
        );

        expect(enabled).toEqual([]);
    });

    it.each(['yes', 'all', 'off'])('rejects %o for registerTypescriptConfigs', (value) => {
        // types never run on a plain js config file
        expect(() =>
            // justified: the fixture feeds the runtime the stale shape the types already reject
            createConfig({
                registerTypescriptConfigs: value as NonNullable<SeedcordConfigOptions['registerTypescriptConfigs']>
            })
        ).toThrow(/takes true, false, or 'no-type-checked'/);
    });
});
