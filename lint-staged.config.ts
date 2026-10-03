import { runEslint, runPrettier } from './scripts/src/lint-staged.ts';

import type { Configuration } from 'lint-staged';

const config: Configuration = {
    '*': runPrettier,
    '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint
};

export default config;
