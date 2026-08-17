import path from 'node:path';

import createConfig from '@seedcord/eslint-config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import reactCompiler from 'eslint-plugin-react-compiler';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerImportPlugin: false,
    registerTypescriptConfigs: false,
    // unicorn needs eslint 10.4 or newer, but this app is still on eslint 9
    registerUnicornPlugin: false,
    tailwindEntryPoint: path.resolve(import.meta.dirname, 'src/app/globals.css'),
    userConfigs: [
        // next's core-web-vitals config already bundles react, hooks, import, jsx-a11y, and @next
        ...nextVitals,

        // react-compiler plugin is still 19.1.0-rc.2, opted in ahead of a stable tag
        reactCompiler.configs.recommended,

        // react-doctor covers the jsx-a11y strict set, so only next's own a11y rules run here
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

        // Next.js reserves these filenames and resolves each by its default export, so the
        // no-default-export ban above would break routing/metadata if left on here.
        {
            files: [
                'src/app/**/{page,layout,loading,error,global-error,not-found,template,default,route,sitemap,robots,manifest}.{ts,tsx}',
                'src/app/**/{icon,apple-icon,opengraph-image,twitter-image}.{ts,tsx}',
                'src/{middleware,instrumentation}.{ts,tsx}'
            ],
            rules: { 'import/no-default-export': 'off' }
        },

        // next's docs recommend ignoring these
        { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] }
    ]
});
