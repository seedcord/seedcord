import path from 'node:path';

import createConfig from '@seedcord/eslint-config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import reactCompiler from 'eslint-plugin-react-compiler';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerImportPlugin: false,
    registerTypescriptConfigs: false,
    // unicorn needs eslint >=10.4; this app is still on eslint 9.
    registerUnicornPlugin: false,
    tailwindEntryPoint: path.resolve(import.meta.dirname, 'src/app/globals.css'),
    userConfigs: [
        // Next core with Web Vitals. Includes react, hooks, import, jsx-a11y, and @next already.
        ...nextVitals,

        // React Compiler diagnostics. Plugin is RC (19.1.0-rc.2) but actively maintained; user opted in.
        reactCompiler.configs.recommended,

        // react-doctor covers the jsx-a11y strict set, so only next's own a11y rules run here
        {
            rules: {
                'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
                // Hardening
                'react/jsx-no-target-blank': 'error',
                'react-hooks/exhaustive-deps': 'error',
                'import/no-anonymous-default-export': 'error',
                'import/no-default-export': 'error'
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

        // Ignores per Next docs
        { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] }
    ]
});
