import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'tsup';

import type { Options } from 'tsup';

export type TsupOptions = Options;

let cachedVersion: string | undefined;

function readPackageVersion(): string {
    if (cachedVersion) return cachedVersion;

    try {
        const pkgPath = resolve(process.cwd(), 'package.json');
        const pkgRaw = readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(pkgRaw) as { version?: unknown };
        if (typeof pkg.version === 'string' && pkg.version.length > 0) {
            cachedVersion = pkg.version;
            return cachedVersion;
        }
    } catch {
        // ignore file system errors and fall back to the default version
    }

    cachedVersion = '0.0.0';
    return cachedVersion;
}

/**
 * Creates a standardized tsup configuration for seedcord packages
 * @param options - Tsup configuration options to override defaults
 * @returns A configured tsup configuration
 */
// eslint-disable-next-line complexity
export function createTsupConfig({
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
    },
    define = {},
    env = {},
    ...rest
}: TsupOptions = {}): TsupOptions {
    const packageVersion = readPackageVersion();

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
        outExtension,
        define: {
            __PACKAGE_VERSION__: JSON.stringify(packageVersion),
            ...define
        },
        env: {
            PACKAGE_VERSION: packageVersion,
            ...env
        },
        ...rest
    }) as Options;
}

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
