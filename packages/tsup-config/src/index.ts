import { defineConfig } from 'tsup';

import type { Options } from 'tsup';

/**
 * Creates a standardized tsup configuration for seedcord packages
 * @param options - Tsup configuration options to override defaults
 * @returns A configured tsup configuration
 */
// eslint-disable-next-line complexity
function createTsupConfig({
  format = ['esm', 'cjs'],
  entry = ['src/index.ts'],
  dts = true,
  shims = true,
  skipNodeModulesBundle = true,
  clean = true,
  treeshake = true,
  platform = 'node',
  target = 'es2022',
  splitting = false,
  cjsInterop = format.includes('cjs'),
  minify = false,
  keepNames = true,
  sourcemap = true,
  outDir = 'dist',
  outExtension = (ctx) => {
    if (ctx.format === 'cjs') {
      return { js: '.cjs' };
    }
    if (ctx.format === 'esm') {
      return { js: '.mjs' };
    }
    return { js: '.js' };
  }
}: Options = {}): Options {
  return defineConfig({
    format,
    entry,
    dts,
    shims,
    skipNodeModulesBundle,
    clean,
    platform,
    target,
    cjsInterop,
    minify,
    splitting,
    keepNames,
    sourcemap,
    treeshake,
    outDir,
    outExtension
  }) as Options;
}

export { createTsupConfig };
export type { Options };
