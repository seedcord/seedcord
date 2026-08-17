import path from 'node:path';

import createConfig from '@seedcord/eslint-config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import reactCompiler from 'eslint-plugin-react-compiler';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerImportPlugin: false,
    registerTypescriptConfigs: false,
    // unicorn needs eslint 10.4 or newer. this app runs eslint 9.
    registerUnicornPlugin: false,
    tailwindEntryPoint: path.resolve(import.meta.dirname, 'src/app/globals.css'),
    userConfigs: [
        ...nextVitals,

        reactCompiler.configs.recommended,

        // react-doctor already covers the jsx-a11y strict set
        {
            rules: {
                'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
                'react/jsx-no-target-blank': 'error',
                'react-hooks/exhaustive-deps': 'error',
                'import/no-anonymous-default-export': 'error',
                'import/no-default-export': 'error',
                'react/forbid-elements': [
                    'error',
                    {
                        forbid: [
                            { element: 'button', message: 'use Button from @seedcord/ui' },
                            { element: 'input', message: 'use Input from @seedcord/ui' },
                            { element: 'select', message: 'use Dropdown from @seedcord/ui' }
                        ]
                    }
                ]
            }
        },

        {
            files: [
                'src/app/**/{page,layout,loading,error,global-error,not-found,template,default,route,sitemap,robots,manifest}.{ts,tsx}',
                'src/app/**/{icon,apple-icon,opengraph-image,twitter-image}.{ts,tsx}',
                'src/{middleware,instrumentation}.{ts,tsx}'
            ],
            rules: { 'import/no-default-export': 'off' }
        },

        { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] }
    ]
});
