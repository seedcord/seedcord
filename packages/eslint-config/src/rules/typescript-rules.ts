import { Linter } from 'eslint';

// TypeScript-specific rules
export const TYPESCRIPT_RULES: Linter.RulesRecord = {
    '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
            allowDirectConstAssertionInArrowFunctions: true
        }
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': [
        'error',
        {
            ignoreRestArgs: true,
            fixToUnknown: true
        }
    ],
    '@typescript-eslint/no-unused-vars': [
        'error',
        {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_'
        }
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off',
    '@typescript-eslint/strict-boolean-expressions': [
        'off',
        {
            allowString: true,
            allowNumber: false,
            allowNullableObject: true,
            allowNullableBoolean: true,
            allowNullableString: true,
            allowNullableNumber: false,
            allowAny: false
        }
    ],
    '@typescript-eslint/consistent-type-imports': [
        'error',
        {
            prefer: 'type-imports',
            disallowTypeAnnotations: false,
            fixStyle: 'separate-type-imports'
        }
    ],
    '@typescript-eslint/consistent-type-exports': [
        'error',
        {
            fixMixedExportsWithInlineTypeSpecifier: true
        }
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/naming-convention': [
        'warn',
        {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow'
        },
        {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow'
        },
        {
            selector: 'function',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow'
        },
        {
            selector: 'typeLike',
            format: ['PascalCase']
        },
        {
            selector: 'enumMember',
            format: ['PascalCase']
        },
        {
            selector: 'property',
            format: null
        },
        {
            selector: 'parameter',
            format: ['camelCase'],
            leadingUnderscore: 'allow'
        },
        {
            selector: 'typeParameter',
            format: ['PascalCase'],
            custom: {
                regex: '^\\w{3,}',
                match: true
            }
        },
        {
            selector: 'import',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow'
        }
    ],
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/no-useless-constructor': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/unified-signatures': 'warn',
    '@typescript-eslint/no-empty-object-type': 'off'
};
