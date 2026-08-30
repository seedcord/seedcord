import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    generalIgnores: ['**/next-env.d.ts', '.next/**', 'out/**', 'build/**']
});
