import { createPrettierConfig } from '@seedcord/eslint-config/prettier';

export default createPrettierConfig({
    tailwind: { stylesheet: './src/app/globals.css' },
    // 68 characters is what the 680px code column fits at the 1280px shell
    overrides: [{ files: 'content/**/*.mdx', options: { printWidth: 68 } }]
});
