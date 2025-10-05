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

// Types
type FlatConfig = ReturnType<typeof tseslint.config>;
type FlatConfigItem = FlatConfig extends readonly (infer U)[] ? U : never;

interface CreateConfigOptions {
  tsconfigRootDir?: string;
  userConfigs?: FlatConfigItem[];
}

// Create the ESLint configuration for Seedcord projects
function createConfig(options: CreateConfigOptions = {}): ReturnType<typeof tseslint.config> {
  const { tsconfigRootDir = process.cwd(), userConfigs = [] } = options;

  // Create TypeScript parser options with dynamic tsconfigRootDir
  const createTsParserOptions = (rootDir: string) => ({
    // Use main tsconfig, can be overridden by consumers if needed
    project: ['./tsconfig.json'],
    tsconfigRootDir: rootDir
  });

  return tseslint.config(
    // Global ignores
    {
      ignores: [...GLOBAL_IGNORES]
    },

    // Base ESLint configuration for JavaScript/MJS files
    {
      files: [...JS_FILES],
      languageOptions: merge({}, JAVASCRIPT_LANGUAGE_OPTIONS),
      linterOptions: COMMON_LINTER_OPTIONS
    },

    // TypeScript-specific configuration
    {
      files: [...TS_FILES],
      languageOptions: merge({}, TYPESCRIPT_LANGUAGE_OPTIONS, {
        parser: tseslint.parser,
        parserOptions: createTsParserOptions(tsconfigRootDir)
      }),
      linterOptions: COMMON_LINTER_OPTIONS
    },

    // Enable recommended configurations for TypeScript files only
    ...tseslint.configs.recommended.map((c) => ({ ...c, files: [...TS_FILES] })),
    ...tseslint.configs.recommendedTypeChecked.map((c) => ({ ...c, files: [...TS_FILES] })),
    ...tseslint.configs.strict.map((c) => ({ ...c, files: [...TS_FILES] })),
    ...tseslint.configs.stylistic.map((c) => ({ ...c, files: [...TS_FILES] })),

    // Security plugin - apply to all files
    {
      files: [...ALL_FILES],
      plugins: {
        security: eslintSecurity
      },
      rules: merge({}, eslintSecurity.configs.recommended.rules)
    },

    // Import plugin - apply to all files
    {
      files: [...ALL_FILES],
      plugins: {
        import: eslintImport
      },
      settings: createImportSettings(tsconfigRootDir),
      rules: IMPORT_RULES
    },

    // Main rules configuration for all files
    {
      files: [...ALL_FILES],
      plugins: {
        prettier: eslintPrettier
      },
      rules: PRETTIER_RULES
    },

    // TypeScript-specific rules configuration
    {
      files: [...TS_FILES],
      plugins: {
        tsdoc: eslintTsdoc
      },
      rules: merge({}, TYPESCRIPT_RULES, TSDOC_RULES, DOCUMENTATION_RULES)
    },

    // Additional rules configuration
    {
      files: [...ALL_FILES],
      rules: merge({}, GENERAL_RULES, SECURITY_RULES, OVERRIDE_RULES)
    },

    // Test files configuration
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
    ...userConfigs
  );
}

export * from './constants';
export * from './rules';
export default createConfig;
export type { CreateConfigOptions };
