import path from 'node:path';

import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    tailwindEntryPoint: path.resolve(import.meta.dirname, 'src/styles/globals.css')
});
