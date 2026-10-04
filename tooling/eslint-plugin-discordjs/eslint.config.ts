import createConfig from '@seedcord/eslint-config-base';

export default [
    ...createConfig({ tsconfigRootDir: import.meta.dirname, relativeImports: 'parent' }),
    {
        // rule visitor keys are the PascalCase AST node names naming-convention would otherwise flag
        files: ['src/rules/**/*.ts'],
        rules: {
            '@typescript-eslint/naming-convention': 'off'
        }
    }
];
