import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

import { defaultPaths } from './paths';
import { normalizeRelativePath, pathExists } from './utils';

import type { ApiDocsPaths } from './paths';
import type { DocEntryPoint, ExportCondition, PackageManifest } from './types';

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
        const { private: isPrivate, seedcordDocs } = await readPackageManifest(packageDir);
        if (!isPrivate && seedcordDocs?.skip !== true) packageDirs.push(packageDir);
    }

    return packageDirs.sort();
}

export async function documentedPackageNames(paths: ApiDocsPaths = defaultPaths): Promise<Set<string>> {
    const dirs = await discoverWorkspacePackages(paths);
    const manifests = await Promise.all(dirs.map((dir) => readPackageManifest(dir)));
    return new Set(manifests.map((manifest) => manifest.name));
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

// `./internal` and `./node/internal` are framework wiring, and CLAUDE.md keeps them off the docs
const INTERNAL_SUBPATH = /(^|\/)internal$/;

function declarationOf(condition: ExportCondition | undefined): string | undefined {
    if (typeof condition === 'string')
        return condition.endsWith('.d.ts') || condition.endsWith('.d.mts') ? condition : undefined;
    if (!condition) return undefined;

    for (const key of ['types', 'import', 'default']) {
        const found = declarationOf(condition[key]);
        if (found) return found;
    }
    return undefined;
}

// tsdown names a subpath's output after its source
async function sourceForDeclaration(packageDir: string, declaration: string): Promise<string | undefined> {
    const stem = path.basename(declaration).replace(/\.d\.[cm]?ts$/, '');
    for (const candidate of [`src/${stem}.ts`, `${stem}.ts`, `src/${stem}.tsx`]) {
        if (await pathExists(path.join(packageDir, candidate))) return candidate;
    }
    return undefined;
}

/**
 * Resolve every import path a package documents, taken from its `exports` map. That map is the
 * authority on what a package exposes.
 */
export async function resolveDocEntryPoints(packageDir: string, manifest: PackageManifest): Promise<DocEntryPoint[]> {
    const entries: DocEntryPoint[] = [];

    for (const [subpath, condition] of Object.entries(manifest.exports ?? {})) {
        if (INTERNAL_SUBPATH.test(subpath)) continue;

        // a package like @seedcord/tsconfig exports json presets and declares no types at all
        const declared = declarationOf(condition);
        if (!declared) continue;

        const declaration = path.join(packageDir, normalizeRelativePath(declared));
        if (!(await pathExists(declaration))) {
            throw new Error(
                `${manifest.name} exports "${subpath}" as ${declared}, which does not exist. Build the package first.`
            );
        }

        const sourceEntry = await sourceForDeclaration(packageDir, declared);
        entries.push({ subpath, declaration, ...(sourceEntry && { sourceEntry }) });
    }

    return entries.sort((a, b) => a.subpath.localeCompare(b.subpath));
}
