// TSDoc rules for enforcing documentation standards
export const TSDOC_RULES = {
  'tsdoc/syntax': 'warn'
};

export const DOCUMENTATION_RULES = {
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
