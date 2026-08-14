import { Linter } from 'eslint';
import { Options } from 'prettier';

export const PRETTIER_CONFIG: Options = {
    tabWidth: 4,
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
    proseWrap: 'never'
};

// the plugin reads the consumer's prettier config
export const PRETTIER_RULES: Linter.RulesRecord = {
    'prettier/prettier': 'error'
};
