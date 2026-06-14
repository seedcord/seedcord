export default {
    extends: ['@commitlint/config-conventional'],
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
                'tests',
                'test',
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
