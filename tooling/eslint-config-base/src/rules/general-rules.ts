import { Linter } from 'eslint';

export const GENERAL_RULES: Linter.RulesRecord = {
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-return-assign': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-await': 'off',
    yoda: 'error',
    complexity: ['warn', 15],
    'max-depth': ['warn', 5],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 5],
    'max-statements': ['warn', 25],
    'max-lines': ['warn', 400],
    'max-lines-per-function': ['warn', { max: 80, skipComments: true, skipBlankLines: true }],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'default-case': 'error',
    'default-case-last': 'error',
    'dot-notation': 'error',
    'guard-for-in': 'error',
    'no-caller': 'error',
    'no-constructor-return': 'error',
    'no-else-return': 'error',
    'no-empty-function': 'error',
    'no-eq-null': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-magic-numbers': [
        'warn',
        {
            ignore: [-1, 0, 1, 2, 5, 10, 20, 100, 1000, 1024, 5000, 10000],
            ignoreArrayIndexes: true,
            ignoreDefaultValues: true,
            ignoreClassFieldInitialValues: true,
            enforceConst: false,
            detectObjects: false
        }
    ],
    'no-multi-spaces': 'error',
    'no-new': 'error',
    'no-new-wrappers': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': 'error',
    'no-proto': 'error',
    'no-self-compare': 'error',
    'no-useless-escape': 'error',
    'no-with': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    radix: 'error',

    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],

    'arrow-body-style': ['error', 'as-needed', { requireReturnForObjectLiteral: false }],

    // flat config replaces this rule wholesale when another block also sets no-restricted-syntax, so keep every selector in this one array
    'no-restricted-syntax': [
        'error',
        {
            selector: 'TSImportType',
            message: "Avoid inline import types. Use `import type { T } from 'pkg'`."
        },
        {
            selector: "TSAsExpression[expression.type='TSAsExpression']",
            message:
                'Avoid redundant double-casts (e.g. `as unknown as Type`). Prefer proper narrowing or a single cast with justification.'
        },
        {
            selector:
                "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression[body.type='BlockStatement']",
            message:
                'Avoid block-bodied exported arrow functions. Use a function declaration or a concise arrow expression.'
        },
        {
            selector: "Program > ExportDefaultDeclaration > ArrowFunctionExpression[body.type='BlockStatement']",
            message:
                'Avoid block-bodied default-exported arrow functions. Use a function declaration or a concise arrow expression.'
        }
    ]
};

export const SECURITY_RULES = {
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-fs-filename': 'off',
    'security/detect-non-literal-regexp': 'off'
};

export const OVERRIDE_RULES = {
    'no-empty-function': 'off',
    'no-useless-constructor': 'off',
    'no-param-reassign': 'off',
    'no-new': 'warn',
    'prefer-template': 'warn'
};
