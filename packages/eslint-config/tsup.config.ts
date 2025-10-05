import { defineConfig } from 'tsup';

export default defineConfig({
    format: ['esm', 'cjs'],
    entry: ['src/index.ts'],
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    clean: true,
    treeshake: true,
    platform: 'node',
    target: 'es2022',
    splitting: false,
    cjsInterop: true,
    minify: false,
    keepNames: true,
    sourcemap: true,
    outDir: 'dist',
    outExtension: (ctx) => {
        if (ctx.format === 'cjs') return { js: '.cjs' };
        if (ctx.format === 'esm') return { js: '.mjs' };
        return { js: '.js' };
    }
});
