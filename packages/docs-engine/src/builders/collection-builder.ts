import { existsSync } from 'node:fs';
import path from 'node:path';

import { buildPackage, type PackageLookups } from './package-builder';
// import { propagateSourceInformation } from './source-fixer';

import type { GlobalId } from '../ids';
import type { DocCollection, DocManifest, DocManifestPackage, DocPackageModel } from '../types';

const normalizeAlias = (value: string): string => value.trim().toLowerCase();

const computeAliases = (name: string): string[] => {
    const aliases = new Set<string>();

    const add = (candidate: string | null | undefined): void => {
        if (!candidate) return;
        aliases.add(candidate);
        aliases.add(normalizeAlias(candidate));
    };

    add(name);

    const withoutScope = name.startsWith('@') ? name.slice(1) : name;
    add(withoutScope);

    const segments = withoutScope.split('/');
    const last = segments.at(-1);
    if (last && last.length > 0) {
        add(last);
    }

    return Array.from(aliases);
};

const createPackageLookups = (packages: DocManifestPackage[]): PackageLookups => {
    const byName = new Map<string, DocManifestPackage>();
    const byAlias = new Map<string, DocManifestPackage>();

    for (const pkg of packages) {
        byName.set(pkg.name, pkg);
        const aliases = computeAliases(pkg.name);
        for (const alias of aliases) {
            const key = normalizeAlias(alias);
            if (!byAlias.has(key)) {
                byAlias.set(key, pkg);
            }
        }
    }

    return { byName, byAlias } satisfies PackageLookups;
};

export interface ResolveOptions {
    workspaceRoot?: string;
    generatedRoot?: string;
    manifestDir: string;
    manifestOutputDir: string;
}

const collectBaseCandidates = (options: ResolveOptions): string[] => {
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

    return Array.from(ordered);
};

const resolvePackageJsonPath = (
    pkg: DocManifestPackage,
    baseCandidates: string[],
    options: ResolveOptions
): string | null => {
    const output = pkg.output?.trim();
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
};

const collectOutputCandidates = (output: string, baseCandidates: string[], options: ResolveOptions): string[] => {
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

    return Array.from(ordered);
};

const resolveManifestOutputBase = (options: ResolveOptions): string | null => {
    const trimmed = options.manifestOutputDir.trim();
    if (trimmed.length === 0) {
        return null;
    }

    if (path.isAbsolute(trimmed)) {
        return trimmed;
    }

    const base = options.workspaceRoot ?? options.manifestDir;
    return path.resolve(base, trimmed);
};

const relativizeFromManifestOutput = (output: string, manifestOutputDir: string): string | null => {
    const trimmedManifest = manifestOutputDir.trim();
    if (trimmedManifest.length === 0) {
        return null;
    }

    const relative = path.relative(trimmedManifest, output);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }

    return relative;
};

export const buildCollection = async (manifest: DocManifest, options: ResolveOptions): Promise<DocCollection> => {
    const baseCandidates = collectBaseCandidates(options);
    const packageLookups = createPackageLookups(manifest.packages);
    const packages: DocPackageModel[] = [];

    for (const pkg of manifest.packages) {
        const projectPath = resolvePackageJsonPath(pkg, baseCandidates, options);
        if (!projectPath) {
            continue;
        }

        const model = await buildPackage(pkg, projectPath, packageLookups);
        packages.push(model);
    }

    // const roots = packages.map((pkg) => pkg.root);
    // propagateSourceInformation(roots);

    const { byKey, byGlobalSlug } = buildGlobalMaps(packages);
    return { manifest, packages, byKey, byGlobalSlug };
};

const buildGlobalMaps = (packages: DocPackageModel[]): Pick<DocCollection, 'byKey' | 'byGlobalSlug'> => {
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
};
