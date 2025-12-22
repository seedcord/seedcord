import createConfig from '@seedcord/eslint-config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    registerImportPlugin: false,
    registerTypescriptConfigs: false,
    userConfigs: [
        // Next core with Web Vitals. Includes react, hooks, import, jsx-a11y, and @next already.
        ...nextVitals,

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
