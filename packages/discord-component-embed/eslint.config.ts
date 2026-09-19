import createConfig from '@seedcord/eslint-config';

const typesOnlyApi = {
    name: 'discord-api-types/v10',
    message:
        'Import types only. A value import bundles all of discord-api-types into every site that uses this package.',
    allowTypeImports: true
};

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    userConfigs: [
        {
            files: ['src/**/*.{ts,tsx}'],
            rules: {
                '@typescript-eslint/no-restricted-imports': [
                    'error',
                    {
                        paths: [typesOnlyApi],
                        patterns: [
                            {
                                group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
                                message:
                                    'Only src/react.index.ts may import React. Everything else has to load without React installed.'
                            }
                        ]
                    }
                ]
            }
        },
        {
            files: ['src/react.index.ts'],
            rules: {
                '@typescript-eslint/no-restricted-imports': ['error', { paths: [typesOnlyApi] }]
            }
        }
    ]
});
