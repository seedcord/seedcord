import { createPrettierConfig } from '@seedcord/eslint-config/prettier';

export default createPrettierConfig({
    // pnpm rewrites this file at 2-space on every catalog write
    overrides: [{ files: 'pnpm-workspace.yaml', options: { tabWidth: 2 } }]
});
