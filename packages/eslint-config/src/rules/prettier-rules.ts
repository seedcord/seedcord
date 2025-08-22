// Prettier configuration

import { Linter } from 'eslint';

// Make sure these match .prettierrc at root
export const PRETTIER_CONFIG = {
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  printWidth: 120,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  useTabs: false,
  quoteProps: 'as-needed',
  bracketSameLine: false,
  proseWrap: 'preserve'
};

export const PRETTIER_RULES: Linter.RulesRecord = {
  'prettier/prettier': [
    'error',
    PRETTIER_CONFIG,
    {
      usePrettierrc: false,
      fileInfoOptions: {
        withNodeModules: false
      }
    }
  ]
};
