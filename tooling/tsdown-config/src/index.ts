import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'vite-plus/pack';

import type { UserConfig } from 'vite-plus/pack';

export type TsdownOptions = UserConfig;

interface PackageFacts {
    version: string;
    nodeRange: string;
    bunRange: string;
}

let cachedFacts: PackageFacts | undefined;

function readPackageFacts(): PackageFacts {
    if (cachedFacts) return cachedFacts;

    let version = '0.0.0';
    let nodeRange = '';
    let bunRange = '';

    try {
        const pkgPath = resolve(process.cwd(), 'package.json');
        const pkgRaw = readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(pkgRaw) as { version?: unknown; engines?: { node?: unknown; bun?: unknown } };
        if (typeof pkg.version === 'string' && pkg.version.length > 0) version = pkg.version;
        if (typeof pkg.engines?.node === 'string') nodeRange = pkg.engines.node;
        if (typeof pkg.engines?.bun === 'string') bunRange = pkg.engines.bun;
    } catch (error) {
        // eslint-disable-next-line no-console -- build-config helper has no Logger
        console.warn(`[tsdown-config] could not read package.json, using defaults: ${String(error)}`);
    }

    cachedFacts = { version, nodeRange, bunRange };
    return cachedFacts;
}

/** Creates a standardized tsdown configuration for seedcord packages. */
// eslint-disable-next-line complexity -- one destructure of every tsdown default
export function createTsdownConfig({
    format = ['esm'],
    entry = ['src/index.ts'],
    dts = true,
    shims = true,
    clean = true,
    treeshake = true,
    platform = 'node',
    target = 'es2022',
    minify = false,
    sourcemap = true,
    outDir = 'dist',
    deps = { neverBundle: true },
    fixedExtension = true,
    checks = { legacyCjs: false },
    define = {},
    env = {},
    ...rest
}: TsdownOptions = {}): TsdownOptions {
    const { version: packageVersion, nodeRange, bunRange } = readPackageFacts();

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
            PACKAGE_NODE_RANGE: nodeRange,
            PACKAGE_BUN_RANGE: bunRange,
            ...env
        },
        ...rest
    });
}

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
