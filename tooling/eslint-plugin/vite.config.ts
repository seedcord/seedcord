import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: createTsdownConfig({
        entry: ['src/index.ts'],
        // the shared utils package is private
        deps: { alwaysBundle: ['@seedcord/eslint-utils'] }
    })
});
