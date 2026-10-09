import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
    extends: ['@commitlint/config-conventional'],
    helpUrl: 'https://github.com/seedcord/seedcord/blob/next/.github/CONTRIBUTING.md#pull-request-guidelines',
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'perf',
                'test',
                'tests',
                'build',
                'ci',
                'chore',
                'revert',
                'types',
                'nit'
            ]
        ]
    }
};

export default config;
