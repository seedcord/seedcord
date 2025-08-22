// Global configuration constants
export const GLOBAL_IGNORES = ['dist/**', 'node_modules/**', 'logs/**'] as const;

export const COMMON_LINTER_OPTIONS = {
  // Use a literal so the type is SeverityString instead of string
  reportUnusedDisableDirectives: 'error'
} as const;

// Language configuration constants
export const JAVASCRIPT_LANGUAGE_OPTIONS = {
  sourceType: 'module' as const,
  ecmaVersion: 'latest' as const
};

export const TYPESCRIPT_LANGUAGE_OPTIONS = {
  // parser will be set dynamically in the config factory
  sourceType: 'module' as const,
  ecmaVersion: 'latest' as const
};

// File patterns
export const ALL_FILES = ['**/*.js', '**/*.mjs', '**/*.ts', '**/*.tsx'] as const;
export const JS_FILES = ['**/*.js', '**/*.mjs'] as const;
export const TS_FILES = ['**/*.ts', '**/*.tsx'] as const;
export const TEST_FILES = ['**/*.test.ts'] as const;
