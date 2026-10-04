import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    generalIgnores: ['**/next-env.d.ts', '.next/**', 'out/**', 'build/**']
});
