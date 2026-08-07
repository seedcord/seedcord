import { PRETTIER_CONFIG } from '@seedcord/eslint-config';

export default {
    ...PRETTIER_CONFIG,
    overrides: [
        // pnpm rewrites this file at 2-space on every catalog write, so matching avoids a fight with prettier
        { files: 'pnpm-workspace.yaml', options: { tabWidth: 2 } }
    ]
};
