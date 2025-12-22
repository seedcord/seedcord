import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    generalIgnores: ['**/*.test-d.ts', '**/*.test-d.tsx']
});
