import { defineConfig } from 'eslint/config';
import path from 'path';
import prettierConfig from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import eslintPrettier from 'eslint-plugin-prettier';
import eslintSecurity from 'eslint-plugin-security';
import eslintTsdoc from 'eslint-plugin-tsdoc';
import eslintUnicorn from 'eslint-plugin-unicorn';
import merge from 'lodash.merge';
import tseslint from 'typescript-eslint';

import { mdxBlock } from './mdx';
import { tailwindBlock } from './tailwind';

import {
    ALL_FILES,
    COMMON_LINTER_OPTIONS,
    GLOBAL_IGNORES,
    JAVASCRIPT_LANGUAGE_OPTIONS,
    JS_FILES,
    TEST_FILES,
    TS_FILES,
    TYPESCRIPT_LANGUAGE_OPTIONS
} from './constants';
import {
    DOCUMENTATION_RULES,
    GENERAL_RULES,
    IMPORT_RULES,
    OVERRIDE_RULES,
    PRETTIER_RULES,
    SECURITY_RULES,
    TSDOC_RULES,
    TYPESCRIPT_RULES,
    UNICORN_RULES,
    createImportSettings
} from './rules';

import type { CreateConfigOptions, FlatConfig, FlatConfigItem } from './options';
import type { Linter } from 'eslint';

function pluginBlock(params: {
    enabled: boolean;
    files: string[];
    pluginName?: string;
    plugin?: unknown;
    rules?: Linter.RulesRecord;
    settings?: Linter.Config['settings'];
}): FlatConfigItem {
    const item: FlatConfigItem = { files: [...params.files] };
    // when disabled, drop the rules and settings as well. eslint throws "rule not found" if a
    // <plugin>/* rule is set while its plugin is unregistered.
    if (!params.enabled) return item;
    if (params.settings) item.settings = params.settings;
    if (params.rules) item.rules = params.rules;
    if (params.plugin && params.pluginName) {
        item.plugins = { [params.pluginName]: params.plugin };
    }
    return item;
}

/**
 * Creates a comprehensive ESLint configuration tailored for JavaScript and TypeScript projects.
 *
 * @param options - Configuration options to customize the ESLint setup.
 */
function createConfig(options: CreateConfigOptions = {}): FlatConfig {
    const {
        tsconfigRootDir = process.cwd(),
        generalIgnores = [],
        userConfigs = [],
        registerImportPlugin = true,
        registerPrettierPlugin = true,
        registerSecurityPlugin = true,
        registerTsdocPlugin = true,
        registerTypescriptConfigs = true,
        registerUnicornPlugin = true,
        tailwindEntryPoint,
        tailwindCalleeFunctions = ['cn'],
        tailwindTaggedTemplates = ['tw'],
        mdxFiles
    } = options;

    const createTsParserOptions = (rootDir: string) => ({
        project: ['./tsconfig.json'],
        tsconfigRootDir: rootDir
    });

    const tsConfigs: FlatConfigItem[] = [];

    if (registerTypescriptConfigs) {
        tsConfigs.push(
            ...tseslint.configs.recommended.map((c) => ({ ...c, files: [...TS_FILES] })),
            ...tseslint.configs.recommendedTypeChecked.map((c) => ({ ...c, files: [...TS_FILES] })),
            ...tseslint.configs.strict.map((c) => ({ ...c, files: [...TS_FILES] })),
            ...tseslint.configs.stylistic.map((c) => ({ ...c, files: [...TS_FILES] }))
        );
    }

    // Resolve general ignores relative to the repository root so callers can
    // provide globs that are local to their package (e.g. "template/**/*.ts").
    const ignoreBase = path.relative(process.cwd(), tsconfigRootDir).replace(/\\/g, '/');
    const resolvedGeneralIgnores = generalIgnores.map((g) => (ignoreBase ? `${ignoreBase}/${g}` : g));

    return defineConfig(
        { ignores: [...GLOBAL_IGNORES, ...resolvedGeneralIgnores] },

        {
            files: [...JS_FILES],
            languageOptions: merge({}, JAVASCRIPT_LANGUAGE_OPTIONS),
            linterOptions: COMMON_LINTER_OPTIONS
        },

        {
            files: [...TS_FILES],
            languageOptions: merge({}, TYPESCRIPT_LANGUAGE_OPTIONS, {
                parser: tseslint.parser,
                parserOptions: createTsParserOptions(tsconfigRootDir)
            }),
            linterOptions: COMMON_LINTER_OPTIONS
        },

        ...tsConfigs,

        pluginBlock({
            enabled: registerSecurityPlugin,
            files: [...ALL_FILES],
            pluginName: 'security',
            plugin: eslintSecurity,
            rules: merge({}, eslintSecurity.configs.recommended.rules) as Linter.RulesRecord
        }),

        pluginBlock({
            enabled: registerImportPlugin,
            files: [...ALL_FILES],
            pluginName: 'import-x',
            plugin: importX,
            settings: createImportSettings(tsconfigRootDir),
            rules: IMPORT_RULES
        }),

        pluginBlock({
            enabled: registerPrettierPlugin,
            files: [...ALL_FILES],
            pluginName: 'prettier',
            plugin: eslintPrettier,
            rules: PRETTIER_RULES
        }),

        pluginBlock({
            enabled: registerTsdocPlugin,
            files: [...TS_FILES],
            pluginName: 'tsdoc',
            plugin: eslintTsdoc,
            rules: merge({}, TYPESCRIPT_RULES, TSDOC_RULES, DOCUMENTATION_RULES)
        }),

        pluginBlock({
            enabled: registerUnicornPlugin,
            files: [...ALL_FILES],
            pluginName: 'unicorn',
            plugin: eslintUnicorn,
            rules: UNICORN_RULES
        }),

        // Opt-in via tailwindEntryPoint; off when omitted (see CreateConfigOptions.tailwindEntryPoint).
        tailwindBlock({
            files: [...TS_FILES],
            entryPoint: tailwindEntryPoint,
            calleeFunctions: tailwindCalleeFunctions,
            taggedTemplates: tailwindTaggedTemplates
        }),

        // Opt-in via mdxFiles; the spread drops the block entirely when omitted.
        ...(mdxFiles ? [mdxBlock(mdxFiles)] : []),

        {
            files: [...ALL_FILES],
            rules: merge({}, GENERAL_RULES, SECURITY_RULES, OVERRIDE_RULES)
        },

        {
            files: [...TEST_FILES],
            rules: {
                'max-lines-per-function': 'off',
                'no-magic-numbers': 'off',
                'no-unused-expressions': 'off',
                'no-restricted-syntax': 'off',
                'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
                '@typescript-eslint/no-non-null-assertion': 'off',
                'max-nested-callbacks': ['warn', 5]
            }
        },

        // Must stay after the rule blocks above so it can disable any formatting rules they enable.
        prettierConfig,

        // Last so consumer overrides win over everything above.
        ...userConfigs
    );
}

export * from './constants';
export * from './mdx';
export * from './rules';
export * from './tailwind';
export type { CreateConfigOptions, FlatConfig, FlatConfigItem };
export default createConfig;

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
