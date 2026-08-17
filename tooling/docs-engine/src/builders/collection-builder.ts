import { existsSync } from 'node:fs';
import path from 'node:path';

import { buildPackageFromApi } from '#builders/package-builder';
import { createApiModel, loadApiPackage } from '#model/load-model';
import { exportedKeysOf } from '#model/merge-entries';

import type { AdapterEntry } from '#model/merge-entries';
import type { GlobalId } from '#src/ids';
import type { DocCollection, DocManifest, DocManifestPackage, DocPackageModel } from '#src/types';
import type { ApiModel } from '@microsoft/api-extractor-model';

export interface ResolveOptions {
    workspaceRoot?: string;
    generatedRoot?: string;
    manifestDir: string;
    manifestOutputDir: string;
}

function collectBaseCandidates(options: ResolveOptions): string[] {
    const ordered = new Set<string>();

    if (options.generatedRoot) {
        ordered.add(options.generatedRoot);
    }

    ordered.add(options.manifestDir);

    const manifestOutputBase = resolveManifestOutputBase(options);
    if (manifestOutputBase) {
        ordered.add(manifestOutputBase);
    }

    if (options.workspaceRoot) {
        ordered.add(options.workspaceRoot);
    }

    return [...ordered];
}

function resolvePackageJsonPath(
    manifestOutput: string | null,
    baseCandidates: string[],
    options: ResolveOptions
): string | null {
    const output = manifestOutput?.trim();
    if (!output) {
        return null;
    }

    const candidates = collectOutputCandidates(output, baseCandidates, options);

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }

        const fallback = path.join(candidate, 'project.json');
        if (existsSync(fallback)) {
            return fallback;
        }
    }

    const [first] = candidates;
    if (!first) {
        return null;
    }

    return first.endsWith('.json') ? first : path.join(first, 'project.json');
}

function collectOutputCandidates(output: string, baseCandidates: string[], options: ResolveOptions): string[] {
    const ordered = new Set<string>();

    const addCandidate = (value: string | null | undefined): void => {
        if (!value) {
            return;
        }
        ordered.add(value);
    };

    if (path.isAbsolute(output)) {
        ordered.add(output);
    }

    addCandidate(options.workspaceRoot ? path.resolve(options.workspaceRoot, output) : null);
    addCandidate(path.resolve(options.manifestDir, output));

    if (options.generatedRoot) {
        addCandidate(path.resolve(options.generatedRoot, output));
    }

    const relativeFromOutputDir = relativizeFromManifestOutput(output, options.manifestOutputDir);
    if (relativeFromOutputDir) {
        addCandidate(path.resolve(options.manifestDir, relativeFromOutputDir));
        if (options.generatedRoot) {
            addCandidate(path.resolve(options.generatedRoot, relativeFromOutputDir));
        }
    }

    for (const base of baseCandidates) {
        addCandidate(path.resolve(base, output));
        addCandidate(path.resolve(base, path.basename(output)));
    }

    return [...ordered];
}

function resolveManifestOutputBase(options: ResolveOptions): string | null {
    const trimmed = options.manifestOutputDir.trim();
    if (trimmed.length === 0) {
        return null;
    }

    if (path.isAbsolute(trimmed)) {
        return trimmed;
    }

    const base = options.workspaceRoot ?? options.manifestDir;
    return path.resolve(base, trimmed);
}

function relativizeFromManifestOutput(output: string, manifestOutputDir: string): string | null {
    const trimmedManifest = manifestOutputDir.trim();
    if (trimmedManifest.length === 0) {
        return null;
    }

    const relative = path.relative(trimmedManifest, output);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }

    return relative;
}

// A package's root entry and its subpaths all carry the same package name, and one ApiModel holding
// two packages of one name throws the moment any @link resolves.
function loadEntries(
    pkg: DocManifestPackage,
    sharedModel: ApiModel,
    resolveOutput: (output: string | null) => string | null
): AdapterEntry[] {
    return pkg.entries.reduce<AdapterEntry[]>((acc, entry) => {
        const apiJsonPath = resolveOutput(entry.output);
        if (!apiJsonPath) return acc;

        if (entry.subpath !== '.') {
            const model = createApiModel();
            acc.push({ subpath: entry.subpath, apiPackage: loadApiPackage(model, apiJsonPath), model });
            return acc;
        }

        const sharedModelPath = resolveOutput(pkg.sharedModel ?? null);
        if (!sharedModelPath) {
            acc.push({
                subpath: entry.subpath,
                apiPackage: loadApiPackage(sharedModel, apiJsonPath),
                model: sharedModel
            });
            return acc;
        }

        // the widened model exports subpath symbols too
        acc.push({
            subpath: entry.subpath,
            apiPackage: loadApiPackage(sharedModel, sharedModelPath),
            model: sharedModel,
            rootExports: exportedKeysOf(loadApiPackage(createApiModel(), apiJsonPath))
        });
        return acc;
    }, []);
}

export function buildCollection(manifest: DocManifest, options: ResolveOptions): DocCollection {
    const baseCandidates = collectBaseCandidates(options);
    const resolveOutput = (output: string | null): string | null =>
        resolvePackageJsonPath(output, baseCandidates, options);

    const model = createApiModel();
    // Load every package into the shared model before adapting any, so cross-package @link
    // references resolve against the full set.
    const loaded: { pkg: DocManifestPackage; entries: AdapterEntry[] }[] = [];
    for (const pkg of manifest.packages) {
        const entries = loadEntries(pkg, model, resolveOutput);
        if (entries.length === 0) continue;
        loaded.push({ pkg, entries });
    }
    const packages = loaded.map(({ pkg, entries }) => buildPackageFromApi(pkg, entries, model));

    const { byKey, byGlobalSlug } = buildGlobalMaps(packages);
    return { manifest, packages, byKey, byGlobalSlug };
}

function buildGlobalMaps(packages: DocPackageModel[]): Pick<DocCollection, 'byKey' | 'byGlobalSlug'> {
    const byKey = new Map<GlobalId, DocPackageModel['root']>();
    const byGlobalSlug = new Map<string, DocPackageModel['root']>();

    for (const pkg of packages) {
        for (const node of pkg.indexes.byId.values()) {
            byKey.set(node.key, node);
            const slugKey = `${pkg.manifest.name}:${node.slug}`;
            byGlobalSlug.set(slugKey, node);
        }
    }

    return { byKey, byGlobalSlug };
}
