import { Linter } from 'eslint';

export const TSDOC_RULES: Linter.RulesRecord = {
    'tsdoc/syntax': 'warn'
};

export const DOCUMENTATION_RULES: Linter.RulesRecord = {
    '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
            allowDirectConstAssertionInArrowFunctions: true
        }
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'warn'
};
