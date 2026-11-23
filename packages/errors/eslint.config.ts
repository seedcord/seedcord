import createConfig from '@seedcord/eslint-config';
import { proseConfig } from '@seedcord/prose';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    userConfigs: [
        ...proseConfig,
        {
            // one enum holds every code, and the satisfies check in ErrorMessages needs one map with every message
            files: ['src/ErrorCodes.ts', 'src/ErrorMessages.ts'],
            rules: { 'max-lines': 'off' }
        }
    ]
});
