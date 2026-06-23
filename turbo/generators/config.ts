import type { PlopTypes } from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
    plop.setGenerator('package', {
        description: 'Scaffold a new published @seedcord/<name> leaf package under packages/',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Unscoped package name (becomes @seedcord/<name> in packages/<name>)',
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
            }
        ],
        actions: [
            {
                type: 'add',
                path: 'packages/{{ name }}/package.json',
                templateFile: 'templates/package.json.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/tsconfig.json',
                templateFile: 'templates/tsconfig.json.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/tsdown.config.ts',
                templateFile: 'templates/tsdown.config.ts.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/eslint.config.mjs',
                templateFile: 'templates/eslint.config.mjs.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/tsdoc.json',
                templateFile: 'templates/tsdoc.json.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/README.md',
                templateFile: 'templates/README.md.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/LICENSE',
                templateFile: 'templates/LICENSE.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/src/index.ts',
                templateFile: 'templates/src/index.ts.hbs'
            },
            {
                type: 'add',
                path: 'packages/{{ name }}/tests/basic.test.ts',
                templateFile: 'templates/tests/basic.test.ts.hbs'
            }
        ]
    });
}
