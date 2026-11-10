import { createViteConfig } from '@seedcord/vite-config';

export default createViteConfig(import.meta.url, {
    test: {
        testTimeout: 60_000
    },
    // inlined to avoid circular dependency. Keep in sync with tooling/tsdown-config/src/index.ts.
    pack: {
        format: ['esm'],
        entry: ['src/index.ts', 'src/prettier.ts'],
        dts: true,
        shims: true,
        clean: true,
        treeshake: true,
        platform: 'node',
        target: 'es2022',
        minify: false,
        sourcemap: true,
        outDir: 'dist',
        deps: { alwaysBundle: ['@seedcord/eslint-config-base'] },
        fixedExtension: true,
        checks: { legacyCjs: false }
    }
});
