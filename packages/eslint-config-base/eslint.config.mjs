import tseslint from 'typescript-eslint';

/**
 * @type {import('typescript-eslint').ConfigArray}
 */
const config = tseslint.config(
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
