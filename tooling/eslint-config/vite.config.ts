import { createTestConfig } from '@seedcord/vitest-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    test: createTestConfig({
        testTimeout: 60_000
    }),
    // inlined to avoid circular dependency. Keep in sync with tooling/tsdown-config/src/index.ts.
    pack: {
        format: ['esm'],
        entry: ['src/index.ts', 'src/prettier.ts', 'src/oxfmt.ts'],
        dts: true,
        shims: true,
        clean: true,
        treeshake: true,
        platform: 'node',
        target: 'es2022',
        minify: false,
        sourcemap: true,
        outDir: 'dist',
        deps: {
            // tsdown <0.23 compatibility: resolve external dependency subpaths.
            // Remove to preserve subpath imports as written (the new default).
            // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
            resolveDepSubpath: true,
            alwaysBundle: ['@seedcord/eslint-config-base']
        },
        fixedExtension: true,
        checks: { legacyCjs: false }
    }
});
