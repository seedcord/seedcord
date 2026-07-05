import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts'],
    // the shared utils package is private, so its code and types must land inside this dist
    deps: { alwaysBundle: ['@seedcord/eslint-utils'] }
});
