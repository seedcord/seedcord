import prettierConfig from 'eslint-config-prettier';
import eslintImport from 'eslint-plugin-import';
import eslintPrettier from 'eslint-plugin-prettier';
import eslintSecurity from 'eslint-plugin-security';
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
} from './constants.mjs';
import { GENERAL_RULES, OVERRIDE_RULES, SECURITY_RULES } from './rules/general-rules.mjs';
import { IMPORT_RULES, IMPORT_SETTINGS } from './rules/import-rules.mjs';
import { PRETTIER_RULES } from './rules/prettier-rules.mjs';
import { TYPESCRIPT_RULES } from './rules/typescript-rules.mjs';

/**
 * @typedef {import('typescript-eslint').Config} Config
 * @typedef {Object} CreateConfigOptions
 * @property {string} [tsconfigRootDir] - Root directory for TypeScript config
 * @property {Config[]} [userConfigs] - Additional user configurations
 */

/**
 * Creates an ESLint configuration
 * @param {CreateConfigOptions} [options={}] - Configuration options
 * @returns {Config[]} ESLint configuration array
 */
export default function createConfig(options = {}) {
  const { tsconfigRootDir = process.cwd(), userConfigs = [] } = options;

  // Create TypeScript parser options with dynamic tsconfigRootDir
  const createTsParserOptions = (rootDir) => ({
    project: ['./tsconfig.json'], // Use main tsconfig, could be overridden with tsconfig.eslint.json if needed
    tsconfigRootDir: rootDir,
    sourceType: 'module',
    ecmaVersion: 2024
  });

  return tseslint.config(
    // Global ignores
    {
      ignores: GLOBAL_IGNORES
    },

    // Base ESLint configuration for JavaScript/MJS files
    {
      files: JS_FILES,
      languageOptions: merge({}, JAVASCRIPT_LANGUAGE_OPTIONS),
      linterOptions: COMMON_LINTER_OPTIONS
    },

    // TypeScript-specific configuration
    {
      files: TS_FILES,
      languageOptions: merge({}, TYPESCRIPT_LANGUAGE_OPTIONS, {
        parser: tseslint.parser,
        parserOptions: createTsParserOptions(tsconfigRootDir)
      }),
      linterOptions: COMMON_LINTER_OPTIONS
    },

    // Enable recommended configurations for TypeScript files only
    {
      files: TS_FILES,
      ...tseslint.configs.recommended.reduce((acc, config) => ({ ...acc, ...config }), {}),
      ...tseslint.configs.recommendedTypeChecked.reduce((acc, config) => ({ ...acc, ...config }), {}),
      ...tseslint.configs.strict.reduce((acc, config) => ({ ...acc, ...config }), {}),
      ...tseslint.configs.stylistic.reduce((acc, config) => ({ ...acc, ...config }), {})
    },

    // Security plugin - apply to all files
    {
      files: ALL_FILES,
      plugins: {
        security: eslintSecurity
      },
      rules: merge({}, eslintSecurity.configs.recommended.rules)
    },

    // Import plugin - apply to all files
    {
      files: ALL_FILES,
      plugins: {
        import: eslintImport
      },
      settings: IMPORT_SETTINGS,
      rules: IMPORT_RULES
    },

    // Main rules configuration for all files
    {
      files: ALL_FILES,
      plugins: {
        prettier: eslintPrettier
      },
      rules: PRETTIER_RULES
    },

    // TypeScript-specific rules configuration
    {
      files: TS_FILES,
      rules: TYPESCRIPT_RULES
    },

    // Additional rules configuration
    {
      files: ALL_FILES,
      rules: merge({}, GENERAL_RULES, SECURITY_RULES, OVERRIDE_RULES)
    },

    // Test files configuration
    {
      files: TEST_FILES,
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
