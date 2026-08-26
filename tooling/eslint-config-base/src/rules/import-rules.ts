import path from 'node:path';

import { Linter } from 'eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

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

/**
 * How much of `eslint-plugin-import-x` to run.
 *
 * `'fast'` turns off `no-cycle` and `no-deprecated`. Those two parse every file an import resolves
 * to. A full seedcord lint run spent about 15% of its rule time in them.
 */
export type ImportPluginLevel = 'all' | 'fast' | 'off';

const CROSS_FILE_RULES = ['import-x/no-cycle', 'import-x/no-deprecated'] as const;

const IMPORT_RULES: Linter.RulesRecord = {
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
                    pattern: '#**',
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

export function createImportRules(level: ImportPluginLevel): Linter.RulesRecord {
    if (level === 'all') return { ...IMPORT_RULES };
    // eslint errors on an inline disable naming an unregistered rule
    const off: Linter.RulesRecord = {};
    for (const rule of CROSS_FILE_RULES) off[rule] = 'off';
    return { ...IMPORT_RULES, ...off };
}
