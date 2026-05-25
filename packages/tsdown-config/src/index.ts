import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'tsdown';

import type { UserConfig } from 'tsdown';

export type TsdownOptions = UserConfig;

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
 * Creates a standardized tsdown configuration for seedcord packages.
 * @param options - tsdown configuration options to override defaults
 * @returns A configured tsdown configuration
 */
// eslint-disable-next-line complexity -- Justified as this sets up default configs for tsdown
export function createTsdownConfig({
    format = ['esm', 'cjs'],
    entry = ['src/index.ts'],
    dts = { cjsReexport: true },
    shims = true,
    clean = true,
    treeshake = true,
    platform = 'node',
    target = 'es2022',
    minify = false,
    sourcemap = true,
    outDir = 'dist',
    deps = { skipNodeModulesBundle: true },
    fixedExtension = true,
    checks = { legacyCjs: false },
    define = {},
    env = {},
    ...rest
}: TsdownOptions = {}): TsdownOptions {
    const packageVersion = readPackageVersion();

    return defineConfig({
        format,
        entry,
        dts,
        shims,
        deps,
        clean,
        platform,
        target,
        minify,
        sourcemap,
        treeshake,
        outDir,
        fixedExtension,
        checks,
        define: {
            __PACKAGE_VERSION__: JSON.stringify(packageVersion),
            ...define
        },
        env: {
            PACKAGE_VERSION: packageVersion,
            ...env
        },
        ...rest
    });
}

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
