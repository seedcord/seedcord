import createConfig from '@seedcord/eslint-config';
import { proseConfig } from '@seedcord/prose';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    generalIgnores: ['**/next-env.d.ts', '.next/**', 'out/**', 'build/**'],
    userConfigs: [...proseConfig]
});
