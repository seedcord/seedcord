// Global configuration constants
export const GLOBAL_IGNORES = ['dist/**', 'node_modules/**', 'logs/**'];

export const COMMON_GLOBALS = {
  node: true,
  es2022: true
};

export const COMMON_LINTER_OPTIONS = {
  reportUnusedDisableDirectives: 'error'
};

// Language configuration constants
export const JAVASCRIPT_LANGUAGE_OPTIONS = {
  sourceType: 'module',
  ecmaVersion: 2024,
  globals: COMMON_GLOBALS
};

export const TYPESCRIPT_LANGUAGE_OPTIONS = {
  parser: null, // Will be set dynamically
  sourceType: 'module',
  ecmaVersion: 2024,
  globals: COMMON_GLOBALS
};

// File patterns
export const ALL_FILES = ['**/*.js', '**/*.mjs', '**/*.ts', '**/*.tsx'];
export const JS_FILES = ['**/*.js', '**/*.mjs'];
export const TS_FILES = ['**/*.ts', '**/*.tsx'];
export const TEST_FILES = ['**/*.test.ts'];
