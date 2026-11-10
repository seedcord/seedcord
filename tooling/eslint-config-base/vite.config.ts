import { defineConfig } from 'vite-plus';

export default defineConfig({
    // inlined to avoid circular dependency. keep in sync with tooling/tsdown-config/src/index.ts.
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
        deps: { neverBundle: true },
        fixedExtension: true,
        checks: { legacyCjs: false }
    }
});
