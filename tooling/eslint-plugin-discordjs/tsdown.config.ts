import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts'],
    // a CommonJS eslint.config.cjs has to require this
    format: ['esm', 'cjs'],
    dts: { cjsReexport: true },
    // the shared utils package is private
    deps: { alwaysBundle: ['@seedcord/eslint-utils'] }
});
