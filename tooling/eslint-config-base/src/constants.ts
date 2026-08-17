export const GLOBAL_IGNORES = ['dist/**', 'node_modules/**', 'logs/**'] as const;

export const COMMON_LINTER_OPTIONS = {
    // as const narrows this to the SeverityString literal type
    reportUnusedDisableDirectives: 'error'
} as const;

export const JAVASCRIPT_LANGUAGE_OPTIONS = {
    sourceType: 'module' as const,
    ecmaVersion: 'latest' as const
};

export const TYPESCRIPT_LANGUAGE_OPTIONS = {
    // parser will be set dynamically in the config factory
    sourceType: 'module' as const,
    ecmaVersion: 'latest' as const
};

export const ALL_FILES = ['**/*.js', '**/*.mjs', '**/*.ts', '**/*.tsx'] as const;
export const JS_FILES = ['**/*.js', '**/*.mjs'] as const;
export const TS_FILES = ['**/*.ts', '**/*.tsx'] as const;
export const TEST_FILES = ['**/*.test.ts', '**/*.test.tsx', '**/*.types-test.ts'] as const;
