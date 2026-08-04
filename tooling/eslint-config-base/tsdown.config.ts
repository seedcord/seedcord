import { defineConfig } from 'tsdown';

// inlined to avoid circular dependency. Keep in sync with tooling/tsdown-config/src/index.ts.
export default defineConfig({
    format: ['esm', 'cjs'],
    entry: ['src/index.ts', 'src/prettier.ts'],
    dts: { cjsReexport: true },
    shims: true,
    clean: true,
    treeshake: true,
    platform: 'node',
    target: 'es2022',
    minify: false,
    sourcemap: true,
    outDir: 'dist',
    deps: { skipNodeModulesBundle: true },
    fixedExtension: true,
    checks: { legacyCjs: false }
});
