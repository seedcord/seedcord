import createConfig from '@seedcord/eslint-config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    generalIgnores: ['template/**/*.ts'],
    userConfigs: [
        {
            files: ['**/*.{ts,tsx}'],
            plugins: {
                react,
                'react-hooks': reactHooks
            },
            rules: {
                ...react.configs.recommended.rules,
                ...reactHooks.configs.recommended.rules,
                'react/react-in-jsx-scope': 'off',
                'react/prop-types': 'off'
            },
            settings: {
                react: {
                    version: 'detect'
                }
            }
        }
    ]
});
