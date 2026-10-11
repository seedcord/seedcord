import { defineConfig } from 'vite-plus';

import { runEslint, runPrettier } from './scripts/src/lint-staged.ts';

export default defineConfig({
    staged: {
        '*': runPrettier,
        '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint
    }
});
