import { parser } from 'typescript-eslint';

import { proseConfig, proseHintsConfig } from '#src/index';

import type { Linter } from 'eslint';

export default [
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        languageOptions: { parser },
        // the source has eslint-disable comments for rules this pass doesn't load
        linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' }
    },
    ...proseConfig,
    ...proseHintsConfig
] satisfies Linter.Config[];
