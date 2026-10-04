// eslint-disable-next-line import-x/no-rename-default -- the plugin exports its default as finalPlugin
import eslintReact from '@eslint-react/eslint-plugin';
import createConfig from '@seedcord/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';

import type { ESLint } from 'eslint';

// justified: ESLint's Plugin type rejects this plugin's nested configs.flat
const reactHooksPlugin = reactHooks as ESLint.Plugin;

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    generalIgnores: ['template/**/*.ts', '**/.build-fixture/**'],
    userConfigs: [
        { ...eslintReact.configs['recommended-typescript'], files: ['**/*.{ts,tsx}'] },
        {
            files: ['**/*.{ts,tsx}'],
            plugins: { 'react-hooks': reactHooksPlugin },
            rules: { ...reactHooks.configs.recommended.rules }
        }
    ]
});
