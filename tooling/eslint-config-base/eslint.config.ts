import tseslint from 'typescript-eslint';

import type { ConfigArray } from 'typescript-eslint';

const config: ConfigArray = tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**']
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts']
    },
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
                project: ['./tsconfig.json']
            }
        }
    },
    ...tseslint.configs.recommendedTypeChecked
);

export default config;
