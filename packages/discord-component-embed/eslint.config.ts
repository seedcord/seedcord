import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    userConfigs: [
        {
            files: ['src/**/*.{ts,tsx}'],
            rules: {
                '@typescript-eslint/no-restricted-imports': [
                    'error',
                    {
                        paths: [
                            {
                                name: 'discord-api-types/v10',
                                message:
                                    'Import types only. A value import bundles all of discord-api-types into every site that uses this package.',
                                allowTypeImports: true
                            }
                        ]
                    }
                ]
            }
        }
    ]
});
