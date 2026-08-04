import createConfig from '@seedcord/eslint-config';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    generalIgnores: ['template/**/*.ts'],
    userConfigs: [
        { ...eslintReact.configs['recommended-typescript'], files: ['**/*.{ts,tsx}'] },
        {
            files: ['**/*.{ts,tsx}'],
            plugins: { 'react-hooks': reactHooks },
            rules: { ...reactHooks.configs.recommended.rules }
        }
    ]
});
