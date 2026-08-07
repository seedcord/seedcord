import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts'],
    // the shared utils package is private
    deps: { alwaysBundle: ['@seedcord/eslint-utils'] }
});
