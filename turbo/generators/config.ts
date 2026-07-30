import type { PlopTypes } from '@turbo/gen';

// eslint-disable-next-line max-lines-per-function -- this is a generator function. it's fine.
export default function generator(plop: PlopTypes.NodePlopAPI): void {
    plop.setGenerator('package', {
        description: 'Scaffold a new published @seedcord/<name> leaf package',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Unscoped package name (becomes @seedcord/<name> in <dir>/<name>)',
                validate: (input: string) => {
                    if (!/^[a-z][a-z0-9-]*$/.test(input)) {
                        return 'Use a lowercase name (letters, digits, hyphens), starting with a letter';
                    }
                    return true;
                }
            },
            {
                type: 'input',
                name: 'description',
                message: 'One-line package description'
            },
            {
                type: 'list',
                name: 'dir',
                message: 'Workspace folder',
                choices: ['packages', 'plugins'],
                default: 'packages'
            }
        ],
        actions: [
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/package.json',
                templateFile: 'templates/package.json.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/tsconfig.json',
                templateFile: 'templates/tsconfig.json.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/tsdown.config.ts',
                templateFile: 'templates/tsdown.config.ts.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/eslint.config.mjs',
                templateFile: 'templates/eslint.config.mjs.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/tsdoc.json',
                templateFile: 'templates/tsdoc.json.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/README.md',
                templateFile: 'templates/README.md.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/LICENSE',
                templateFile: 'templates/LICENSE.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/src/index.ts',
                templateFile: 'templates/src/index.ts.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/tests/basic.test.ts',
                templateFile: 'templates/tests/basic.test.ts.hbs'
            },
            {
                type: 'add',
                path: '{{ dir }}/{{ name }}/vitest.config.ts',
                templateFile: 'templates/vitest.config.ts.hbs'
            }
        ]
    });
}
