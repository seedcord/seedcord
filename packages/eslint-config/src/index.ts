import { defineConfig } from 'eslint/config';
import path from 'path';
import prettierConfig from 'eslint-config-prettier';
import eslintImport from 'eslint-plugin-import';
import eslintPrettier from 'eslint-plugin-prettier';
import eslintSecurity from 'eslint-plugin-security';
import eslintTsdoc from 'eslint-plugin-tsdoc';
import merge from 'lodash.merge';
import tseslint from 'typescript-eslint';

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
    createImportSettings
} from './rules';

import type { Linter } from 'eslint';

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
    /** Root directory for TypeScript configuration {@default `process.cwd()`} */
    tsconfigRootDir?: string;

    /** Additional glob patterns to extend the shared ignore list */
    generalIgnores?: string[];

    /** Additional user-defined ESLint configuration items to merge */
    userConfigs?: FlatConfigItem[];

    /** Toggle registration of the `eslint-plugin-import` plugin {@default true} */
    registerImportPlugin?: boolean;

    /** Toggle registration of the `eslint-plugin-prettier` plugin {@default true} */
    registerPrettierPlugin?: boolean;

    /** Toggle registration of the `eslint-plugin-security` plugin {@default true} */
    registerSecurityPlugin?: boolean;

    /** Toggle registration of the `eslint-plugin-tsdoc` plugin {@default true} */
    registerTsdocPlugin?: boolean;

    /** Toggle registration of TypeScript ESLint configs {@default true} */
    registerTypescriptConfigs?: boolean;

    /**
     * Absolute path to the consumer's Tailwind entry CSS file (the one with `@import 'tailwindcss'`).
     * When provided, the canonical-class lint rules are registered as `warn`:
     * - `better-tailwindcss/enforce-canonical-classes` (shorthand combining, e.g. `h-N w-N → size-N`)
     * - `tailwind-canonical-classes/tailwind-canonical-classes` (arbitrary-value scale normalization)
     *
     * When omitted, both rules are off — useful for packages with no Tailwind surface (CLI, framework, types).
     * Shared packages without their own `globals.css` should pass a sibling app's entry via {@link resolveSharedTailwindEntry}.
     *
     * Requires `tailwindcss` to be installed in the consuming package (an optional peerDependency).
     */
    tailwindEntryPoint?: string;

    /**
     * Utility function names whose string arguments should be scanned for non-canonical Tailwind classes.
     *
     * Applied to both plugins (better-tailwindcss `callees` + tailwind-canonical-classes `calleeFunctions`).
     * Defaults cover seedcord's `cn`/`clsx`/`twMerge` helpers. Add `'cva'` if a package consumes CVA.
     *
     * @default ['cn', 'clsx', 'twMerge']
     */
    tailwindCalleeFunctions?: string[];

    /**
     * Tagged template literal names whose template content should be scanned for non-canonical Tailwind classes.
     *
     * Only the `better-tailwindcss` plugin supports tagged templates today; `tailwind-canonical-classes`
     * canonicalizes JSX className attrs + string-literal callees only. Seedcord uses a custom `tw` template
     * tag in `apps/docs/src/lib/utils.ts`, so the default scans that.
     *
     * @default ['tw']
     */
    tailwindTaggedTemplates?: string[];
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
        tailwindEntryPoint,
        tailwindCalleeFunctions = ['cn', 'clsx', 'twMerge'],
        tailwindTaggedTemplates = ['tw']
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
        // Global ignores
        { ignores: [...GLOBAL_IGNORES, ...resolvedGeneralIgnores] },

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
        ...tsConfigs,

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

        // Tailwind canonical-class lint (autofix; opt-in via tailwindEntryPoint)
        tailwindBlock({
            files: [...TS_FILES],
            entryPoint: tailwindEntryPoint,
            calleeFunctions: tailwindCalleeFunctions,
            taggedTemplates: tailwindTaggedTemplates
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
                'no-restricted-syntax': 'off',
                'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
                '@typescript-eslint/no-non-null-assertion': 'off',
                'max-nested-callbacks': ['warn', 5]
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
export * from './tailwind';
export type { CreateConfigOptions, FlatConfig, FlatConfigItem };
export default createConfig;

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
