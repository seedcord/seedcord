import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/**/*.{ts,tsx}'],
    format: ['esm'],
    platform: 'neutral',
    shims: false,
    target: 'esnext',
    dts: true,
    unbundle: true
});
