import createConfig from '@seedcord/eslint-config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactCompiler from 'eslint-plugin-react-compiler';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerImportPlugin: false,
    registerTypescriptConfigs: false,
    userConfigs: [
        // Next core with Web Vitals. Includes react, hooks, import, jsx-a11y, and @next already.
        ...nextVitals,

        // React Compiler diagnostics. Plugin is RC (19.1.0-rc.2) but actively maintained; user opted in.
        reactCompiler.configs.recommended,

        // Do not redeclare plugins. Lift only strict a11y rules.
        {
            rules: {
                ...jsxA11y.flatConfigs.strict.rules,
                'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
                // Hardening
                'react/jsx-no-target-blank': 'error',
                'react-hooks/exhaustive-deps': 'error',
                'import/no-anonymous-default-export': 'error'
            }
        },

        // Ignores per Next docs
        { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] }
    ]
});
