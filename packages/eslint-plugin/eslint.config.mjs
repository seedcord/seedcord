import createConfig from '@seedcord/eslint-config';

export default [
    ...createConfig({ tsconfigRootDir: import.meta.dirname }),
    {
        // rule visitor keys are the PascalCase AST node names naming-convention would otherwise flag
        files: ['src/rules/**/*.ts'],
        rules: {
            '@typescript-eslint/naming-convention': 'off'
        }
    }
];
