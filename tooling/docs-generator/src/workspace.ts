import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

import { defaultPaths } from './paths';
import { normalizeRelativePath, pathExists } from './utils';

import type { ApiDocsPaths } from './paths';
import type { PackageManifest } from './types';

// Fallback entry when package.json has no seedcordDocs.entryPoints override.
const DEFAULT_ENTRY_POINTS = ['src/index.ts'];

const WORKSPACE_FILE = 'pnpm-workspace.yaml';

interface WorkspaceFile {
    packages: string[];
}

export async function discoverWorkspacePackages(paths: ApiDocsPaths = defaultPaths): Promise<string[]> {
    const { packagesDir, repoRoot } = paths;
    const root = packagesDir ?? repoRoot;
    const patterns = packagesDir ? ['*'] : await readWorkspacePatterns(repoRoot);
    const manifestPatterns = patterns.map((pattern) => `${pattern}/package.json`);
    const packageDirs: string[] = [];

    for await (const match of glob(manifestPatterns, { cwd: root })) {
        const packageDir = path.resolve(root, path.dirname(match));
        const { private: isPrivate } = await readPackageManifest(packageDir);
        if (!isPrivate) packageDirs.push(packageDir);
    }

    return packageDirs.sort();
}

async function readWorkspacePatterns(repoRoot: string): Promise<string[]> {
    const workspacePath = path.join(repoRoot, WORKSPACE_FILE);
    const parsed: unknown = parse(await readFile(workspacePath, 'utf8'));
    if (!isWorkspaceFile(parsed)) {
        throw new Error(`Malformed ${workspacePath}: "packages" must be a list of globs.`);
    }
    return parsed.packages;
}

function isWorkspaceFile(value: unknown): value is WorkspaceFile {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return Array.isArray(candidate.packages) && candidate.packages.every((entry) => typeof entry === 'string');
}

export async function readPackageManifest(packageDir: string): Promise<PackageManifest> {
    const packageJsonPath = path.join(packageDir, 'package.json');
    const raw = await readFile(packageJsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isPackageManifest(parsed)) {
        throw new Error(`Malformed package.json at ${packageJsonPath}: "name" and "version" must be strings.`);
    }
    return parsed;
}

function isPackageManifest(value: unknown): value is PackageManifest {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.name === 'string' && typeof candidate.version === 'string';
}

export async function readReadme(packageDir: string): Promise<string | null> {
    const readmePath = path.join(packageDir, 'README.md');
    if (!(await pathExists(readmePath))) return null;
    return readFile(readmePath, 'utf8');
}

/** The unscoped package name. `@seedcord/utils` becomes `utils`, a bare `utils` is returned as-is. */
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
