import { createTsdownConfig } from '@seedcord/tsdown-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: [
        createTsdownConfig({
            entry: ['src/index.ts', 'src/react.index.ts', 'src/jsx-runtime.ts', 'src/jsx-dev-runtime.ts'],
            platform: 'neutral',
            shims: false,
            deps: { dts: { alwaysBundle: [/^discord-api-types\//] } }
        }),
        createTsdownConfig({ entry: ['src/cli.ts'], dts: false, shims: false, clean: false })
    ]
});
