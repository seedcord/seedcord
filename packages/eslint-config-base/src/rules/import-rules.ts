import path from 'node:path';

import { Linter } from 'eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

// Import plugin configuration
export const createImportSettings = (rootDir: string) => ({
    'import-x/resolver-next': [
        createTypeScriptImportResolver({
            alwaysTryTypes: true,
            project: [path.join(rootDir, 'tsconfig.json')]
        })
    ],
    'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import-x/internal-regex': '^(src/|@/)',
    'import-x/external-module-folders': ['node_modules', 'dist']
});

export const IMPORT_RULES: Linter.RulesRecord = {
    'import-x/order': [
        'warn',
        {
            groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
            'newlines-between': 'always',
            alphabetize: {
                order: 'asc',
                caseInsensitive: true,
                orderImportKind: 'asc'
            },
            warnOnUnassignedImports: false,
            distinctGroup: true,
            pathGroups: [
                {
                    pattern: '@/**',
                    group: 'internal',
                    position: 'before'
                }
            ],
            pathGroupsExcludedImportTypes: ['builtin']
        }
    ],
    'import-x/newline-after-import': ['error', { count: 1 }],
    'import-x/no-duplicates': ['error', { considerQueryString: true }],
    'import-x/no-unresolved': 'error',
    'import-x/no-cycle': 'warn',
    'import-x/no-unused-modules': 'off',
    'import-x/no-deprecated': 'warn',
    'import-x/first': 'error',
    'import-x/no-absolute-path': 'error',
    'import-x/no-self-import': 'error',
    'import-x/no-useless-path-segments': ['error', { noUselessIndex: true }],
    'import-x/no-rename-default': 'error'
};
