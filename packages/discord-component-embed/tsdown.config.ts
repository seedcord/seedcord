import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts', 'src/react.index.ts', 'src/jsx-runtime.ts', 'src/jsx-dev-runtime.ts'],
    platform: 'neutral',
    shims: false
});
