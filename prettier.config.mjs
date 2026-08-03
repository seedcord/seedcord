import { PRETTIER_CONFIG } from '@seedcord/eslint-config';

export default {
    ...PRETTIER_CONFIG,
    overrides: [
        // pnpm rewrites this at 2-space on any catalog write, matching it keeps the two off each other
        { files: 'pnpm-workspace.yaml', options: { tabWidth: 2 } }
    ]
};
