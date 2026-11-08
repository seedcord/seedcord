import { createTsdownConfig } from '@seedcord/tsdown-config';
import { createViteConfig } from '@seedcord/vitest-config';

export default createViteConfig(import.meta.url, {
    pack: [
        createTsdownConfig({
            entry: ['src/index.ts', 'src/react.index.ts', 'src/jsx-runtime.ts', 'src/jsx-dev-runtime.ts'],
            platform: 'neutral',
            shims: false,
            deps: { dts: { alwaysBundle: [/^discord-api-types\//] } }
        }),
        createTsdownConfig({
            entry: ['src/cli.ts'],
            dts: false,
            shims: false,
            clean: false
        })
    ]
});
