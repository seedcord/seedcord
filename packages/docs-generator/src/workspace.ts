import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { defaultPaths } from './paths';
import { normalizeRelativePath, pathExists } from './utils';

import type { ApiDocsPaths } from './paths';
import type { PackageManifest } from './types';

// Fallback entry when package.json has no seedcordDocs.entryPoints override.
export const DEFAULT_ENTRY_POINTS = ['src/index.ts'];

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

export async function readPackageManifest(packageDir: string): Promise<PackageManifest> {
    const packageJsonPath = path.join(packageDir, 'package.json');
    const raw = await readFile(packageJsonPath, 'utf8');
    return JSON.parse(raw) as PackageManifest;
}

/** The unscoped package name: `@seedcord/utils` becomes `utils`; a bare `utils` is returned as-is. */
export function unscopedName(name: string): string {
    return name.split('/').pop() ?? name;
}

/**
 * Resolve a package's existing source entry points: `seedcordDocs.entryPoints` overrides, then
 * `src/index.ts`, then the `types` entry. A package with none is treated as not documentable.
 */
export async function resolveEntryPoints(packageDir: string, manifest: PackageManifest): Promise<string[]> {
    const configured = manifest.seedcordDocs?.entryPoints ?? [];
    const candidateRelPaths = [...configured, ...DEFAULT_ENTRY_POINTS];
    const absolute: string[] = [];

    for (const candidate of candidateRelPaths) {
        const normalized = normalizeRelativePath(candidate);
        if (!normalized) continue;

        const absolutePath = path.join(packageDir, normalized);
        if (await pathExists(absolutePath)) absolute.push(absolutePath);
    }

    if (absolute.length === 0 && manifest.types) {
        const declarationCandidate = path.join(packageDir, normalizeRelativePath(manifest.types));
        if (await pathExists(declarationCandidate)) absolute.push(declarationCandidate);
    }

    return absolute;
}
