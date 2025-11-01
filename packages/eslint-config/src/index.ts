import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import eslintImport from 'eslint-plugin-import';
import eslintPrettier from 'eslint-plugin-prettier';
import eslintSecurity from 'eslint-plugin-security';
import eslintTsdoc from 'eslint-plugin-tsdoc';
import merge from 'lodash.merge';
import tseslint from 'typescript-eslint';

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
    createImportSettings
} from './rules';

import type { ESLint, Linter } from 'eslint';

/**
 * Flattened type for the entire ESLint configuration array.
 *
 * @internal
 */
type FlatConfig = Linter.Config[];

/**
 * Flattened type for ESLint configuration items.
 *
 * @internal
 */
type FlatConfigItem = Linter.Config;

/**
 * Options for creating the ESLint configuration.
 *
 */
interface CreateConfigOptions {
    /** Root directory for TypeScript configuration (default: `process.cwd()`) */
    tsconfigRootDir?: string;

    /** Additional user-defined ESLint configuration items to merge */
    userConfigs?: FlatConfigItem[];

    /** Toggle registration of the `eslint-plugin-import` plugin (default: `true`) */
    registerImportPlugin?: boolean;

    /** Toggle registration of the `eslint-plugin-prettier` plugin (default: `true`) */
    registerPrettierPlugin?: boolean;

    /** Toggle registration of the `eslint-plugin-security` plugin (default: `true`) */
    registerSecurityPlugin?: boolean;

    /** Toggle registration of the `eslint-plugin-tsdoc` plugin (default: `true`) */
    registerTsdocPlugin?: boolean;
}

// Helper to build a config item with optional plugin registration
function pluginBlock(params: {
    enabled: boolean;
    files: string[];
    pluginName?: string;
    plugin?: unknown;
    rules?: Linter.RulesRecord;
    settings?: Linter.Config['settings'];
}): FlatConfigItem {
    const item: FlatConfigItem = { files: [...params.files] };
    if (params.settings) item.settings = params.settings;
    if (params.rules) item.rules = params.rules;
    if (params.enabled && params.plugin && params.pluginName) {
        item.plugins = { [params.pluginName]: params.plugin } as Record<string, ESLint.Plugin>;
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
        userConfigs = [],
        registerImportPlugin = true,
        registerPrettierPlugin = true,
        registerSecurityPlugin = true,
        registerTsdocPlugin = true
    } = options;

    const createTsParserOptions = (rootDir: string) => ({
        project: ['./tsconfig.json'],
        tsconfigRootDir: rootDir
    });

    return defineConfig(
        // Global ignores
        { ignores: [...GLOBAL_IGNORES] },

        // Base ESLint configuration for JavaScript files
        {
            files: [...JS_FILES],
            languageOptions: merge({}, JAVASCRIPT_LANGUAGE_OPTIONS),
            linterOptions: COMMON_LINTER_OPTIONS
        },

        // TypeScript specific configuration
        {
            files: [...TS_FILES],
            languageOptions: merge({}, TYPESCRIPT_LANGUAGE_OPTIONS, {
                parser: tseslint.parser,
                parserOptions: createTsParserOptions(tsconfigRootDir)
            }),
            linterOptions: COMMON_LINTER_OPTIONS
        },

        // typescript eslint shared configs applied to TS files only
        ...tseslint.configs.recommended.map((c) => ({ ...c, files: [...TS_FILES] })),
        ...tseslint.configs.recommendedTypeChecked.map((c) => ({ ...c, files: [...TS_FILES] })),
        ...tseslint.configs.strict.map((c) => ({ ...c, files: [...TS_FILES] })),
        ...tseslint.configs.stylistic.map((c) => ({ ...c, files: [...TS_FILES] })),

        // Security
        pluginBlock({
            enabled: registerSecurityPlugin,
            files: [...ALL_FILES],
            pluginName: 'security',
            plugin: eslintSecurity,
            rules: merge({}, eslintSecurity.configs.recommended.rules) as Linter.RulesRecord
        }),

        // Import
        pluginBlock({
            enabled: registerImportPlugin,
            files: [...ALL_FILES],
            pluginName: 'import',
            plugin: eslintImport,
            settings: createImportSettings(tsconfigRootDir),
            rules: IMPORT_RULES
        }),

        // Prettier
        pluginBlock({
            enabled: registerPrettierPlugin,
            files: [...ALL_FILES],
            pluginName: 'prettier',
            plugin: eslintPrettier,
            rules: PRETTIER_RULES
        }),

        // TSDoc
        pluginBlock({
            enabled: registerTsdocPlugin,
            files: [...TS_FILES],
            pluginName: 'tsdoc',
            plugin: eslintTsdoc,
            rules: merge({}, TYPESCRIPT_RULES, TSDOC_RULES, DOCUMENTATION_RULES)
        }),

        // Additional rules for all files
        {
            files: [...ALL_FILES],
            rules: merge({}, GENERAL_RULES, SECURITY_RULES, OVERRIDE_RULES)
        },

        // Test files
        {
            files: [...TEST_FILES],
            rules: {
                'max-lines-per-function': 'off',
                'no-magic-numbers': 'off',
                'no-unused-expressions': 'off',
                'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }]
            }
        },

        // Prettier config to disable conflicting rules
        prettierConfig,

        // User provided configs last
        ...userConfigs
    );
}

export * from './constants';
export * from './rules';
export type { CreateConfigOptions, FlatConfig, FlatConfigItem };
export default createConfig;
