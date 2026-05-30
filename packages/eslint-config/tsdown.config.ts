import { defineConfig } from 'tsdown';

// Inlined (not using createTsdownConfig) because @seedcord/tsdown-config
// depends on @seedcord/eslint-config transitively. Keep this file in sync
// with packages/tsdown-config/src/index.ts defaults.
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
