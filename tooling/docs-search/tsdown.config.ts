import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts'],
    deps: { neverBundle: true, alwaysBundle: ['@seedcord/ui/sites'] }
});
