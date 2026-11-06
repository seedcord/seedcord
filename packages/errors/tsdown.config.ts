import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts', 'src/internal.index.ts', 'src/ErrorCodes.ts'],
    deps: { neverBundle: true, alwaysBundle: ['@seedcord/brand'] }
});
