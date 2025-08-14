// Import plugin configuration
export const IMPORT_SETTINGS = {
  'import/resolver': {
    typescript: {
      alwaysTryTypes: true,
      project: './tsconfig.json'
    },
    node: {
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    }
  },
  'import/parsers': {
    '@typescript-eslint/parser': ['.ts', '.tsx']
  },
  'import/internal-regex': '^(src/|@/)',
  'import/external-module-folders': ['node_modules', 'dist']
};

export const IMPORT_RULES = {
  'import/order': [
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
  'import/newline-after-import': ['error', { count: 1 }],
  'import/no-duplicates': ['error', { considerQueryString: true }],
  'import/no-unresolved': 'error',
  'import/no-cycle': 'warn',
  'import/no-unused-modules': 'off',
  'import/no-deprecated': 'warn',
  'import/first': 'error',
  'import/no-absolute-path': 'error',
  'import/no-self-import': 'error',
  'import/no-useless-path-segments': ['error', { noUselessIndex: true }]
};
