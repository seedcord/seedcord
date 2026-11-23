import path from 'node:path';

import createConfig from '@seedcord/eslint-config';
import { proseConfig } from '@seedcord/prose';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    tailwindEntryPoint: path.resolve(import.meta.dirname, 'src/styles/globals.css'),
    userConfigs: [...proseConfig]
});
