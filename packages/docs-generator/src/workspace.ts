import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { defaultPaths } from './paths';
import { normalizeRelativePath, pathExists } from './utils';

import type { ApiDocsPaths } from './paths';
import type { PackageManifest } from './types';

// most packages have a src/index.ts entry point unless they say otherwise
export const DEFAULT_ENTRY_POINTS = ['src/index.ts'];

/**
 * find every package folder that actually has a package.json file
 */
export async function discoverWorkspacePackages(paths: ApiDocsPaths = defaultPaths): Promise<string[]> {
    const entries = await readdir(paths.packagesDir, { withFileTypes: true });
    const packageDirs: string[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const packageDir = path.join(paths.packagesDir, entry.name);
        const packageJsonPath = path.join(packageDir, 'package.json');

        if (await pathExists(packageJsonPath)) packageDirs.push(packageDir);
    }

    return packageDirs;
}

/**
 * load the package.json so we can grab names, versions, and any custom doc config
 */
export async function readPackageManifest(packageDir: string): Promise<PackageManifest> {
    const packageJsonPath = path.join(packageDir, 'package.json');
    const raw = await readFile(packageJsonPath, 'utf8');
    return JSON.parse(raw) as PackageManifest;
}

/**
 * figure out which files typedoc should start from for a given package
 * it respects overrides in package.json, falls back to src/index.ts, and will try the types entry too
 */
export async function resolveEntryPoints(
    packageDir: string,
    manifest: PackageManifest
): Promise<{ absolute: string[]; relative: string[] }> {
    const configured = manifest.seedcordDocs?.entryPoints ?? [];
    const candidateRelPaths = [...configured, ...DEFAULT_ENTRY_POINTS];
    const absolute: string[] = [];
    const relative: string[] = [];

    for (const candidate of candidateRelPaths) {
        const normalized = normalizeRelativePath(candidate);
        if (!normalized) continue;

        const absolutePath = path.join(packageDir, normalized);
        if (await pathExists(absolutePath)) {
            absolute.push(absolutePath);
            relative.push(normalized);
        }
    }

    if (absolute.length === 0 && manifest.types) {
        const normalizedTypes = normalizeRelativePath(manifest.types);
        const declarationCandidate = path.join(packageDir, normalizedTypes);

        if (await pathExists(declarationCandidate)) {
            absolute.push(declarationCandidate);
            relative.push(normalizedTypes);
        }
    }

    return { absolute, relative };
}

/**
 * pick the tsconfig typedoc should use, falling back to the package default unless someone points elsewhere
 */
export function resolveTsconfigPath(packageDir: string, manifest: PackageManifest): string {
    const override = manifest.seedcordDocs?.tsconfig;
    if (!override) return path.join(packageDir, 'tsconfig.json');

    if (path.isAbsolute(override)) return override;

    return path.join(packageDir, normalizeRelativePath(override));
}
