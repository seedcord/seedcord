import { existsSync } from 'node:fs';
import path from 'node:path';

import { ReflectionKind } from 'typedoc';

import { buildCollection, type ResolveOptions } from './builders/collection-builder';
import { resolveManifestPath } from './constants';
import { ManifestReader } from './manifest-reader';

import type { DirectorySnapshot, PackageDirectory } from './directory';
import type { GlobalId } from './ids';
import type { DocCollection, DocManifest, DocNode, DocPackageModel, DocReference, DocSearchEntry } from './types';

export interface DocsEngineOptions {
    generatedRoot: string;
    manifestPath?: string;
    workspaceRoot?: string;
    manifest?: DocManifest;
}

export class DocsEngine {
    private readonly searchIndex: DocSearchEntry[];
    private readonly directories: Map<string, PackageDirectory>;

    private constructor(private readonly collection: DocCollection) {
        this.searchIndex = aggregateSearchIndex(collection);
        this.directories = new Map(collection.packages.map((pkg) => [pkg.manifest.name, pkg.directory] as const));
    }

    static async create(options: DocsEngineOptions): Promise<DocsEngine> {
        const generatedRoot = path.resolve(options.generatedRoot);
        const manifestPath = resolveManifestPath(generatedRoot, options.manifestPath);
        let manifest = options.manifest;
        if (!manifest) {
            const reader = new ManifestReader({ rootDir: generatedRoot, manifestPath });
            manifest = await reader.read();
        }
        const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot, generatedRoot);
        const manifestDir = path.dirname(manifestPath);

        return DocsEngine.fromManifest(manifest, {
            workspaceRoot,
            manifestDir,
            manifestOutputDir: manifest.outputDir,
            generatedRoot
        });
    }

    static async fromManifest(manifest: DocManifest, resolve: ResolveOptions): Promise<DocsEngine> {
        const coll = await buildCollection(manifest, resolve);
        return new DocsEngine(coll);
    }

    getManifest(): DocManifest {
        return this.collection.manifest;
    }

    listPackages(): string[] {
        return this.collection.packages.map((pkg) => pkg.manifest.name);
    }

    getPackage(name: string): DocPackageModel | null {
        return this.collection.packages.find((pkg) => pkg.manifest.name === name) ?? null;
    }

    getPackageDirectory(name: string): PackageDirectory | null {
        return this.directories.get(name) ?? null;
    }

    listPackageEntities(name: string): DirectorySnapshot | null {
        const directory = this.getPackageDirectory(name);
        return directory ? directory.snapshot() : null;
    }

    getNodeBySlug(pkgName: string, slug: string): DocNode | null {
        const pkg = this.getPackage(pkgName);
        if (!pkg) {
            return null;
        }

        return pkg.indexes.bySlug.get(slug) ?? null;
    }

    getNodeByQualifiedName(pkgName: string, qualifiedName: string): DocNode | null {
        const pkg = this.getPackage(pkgName);
        if (!pkg) {
            return null;
        }

        return pkg.indexes.byQName.get(qualifiedName) ?? null;
    }

    getNodeByKey(key: GlobalId): DocNode | null {
        return this.collection.byKey.get(key) ?? null;
    }

    getNodeByGlobalSlug(packageName: string, slug: string): DocNode | null {
        const key = `${packageName}:${slug}`;
        return this.collection.byGlobalSlug.get(key) ?? null;
    }

    search(query: string, pkgName?: string): DocSearchEntry[] {
        const tokens = tokenizeQuery(query);
        if (tokens.length === 0) {
            return [];
        }

        const source = pkgName ? (this.getPackage(pkgName)?.indexes.search ?? []) : this.searchIndex;

        const score = (entry: DocSearchEntry): number => {
            let value = 0;
            const slugTokens = tokenizeSlug(entry.slug);

            for (const token of tokens) {
                if (safeEquals(entry.name, token)) {
                    value += SCORE_NAME_EXACT;
                }

                if (safeEquals(entry.qualifiedName, token)) {
                    value += SCORE_QNAME_EXACT;
                }

                if (entry.tokens.includes(token)) {
                    value += SCORE_TOKEN_MATCH;
                }

                if (entry.tokens.some((candidate) => candidate.startsWith(token))) {
                    value += SCORE_TOKEN_PREFIX;
                }

                if (entry.aliases?.some((alias) => safeEquals(alias, token))) {
                    value += SCORE_ALIAS_EXACT;
                }

                if (entry.file && safeEquals(entry.file, token)) {
                    value += SCORE_FILE_EXACT;
                }

                if (safeEquals(entry.packageName, token) || safeEquals(entry.packageVersion, token)) {
                    value += SCORE_PACKAGE_MATCH;
                }

                if (slugTokens.has(token)) {
                    value += SCORE_SLUG_EXACT;
                } else if (hasSlugPrefix(slugTokens, token)) {
                    value += SCORE_SLUG_PREFIX;
                }
            }

            if (value > 0) {
                value += getKindWeight(entry.kind);
            }

            return value;
        };

        return source
            .map((entry) => ({ entry, value: score(entry) }))
            .filter(({ value }) => value > 0)
            .sort((a, b) => b.value - a.value)
            .map(({ entry }) => entry);
    }

    resolveReference(
        currentPackage: string,
        reference: DocReference | null
    ): { packageName?: string; slug?: string; externalUrl?: string } {
        if (!reference) {
            return {};
        }

        if (reference.externalUrl) {
            return { externalUrl: reference.externalUrl };
        }

        if (reference.targetKey) {
            const targetNode = this.getNodeByKey(reference.targetKey);
            if (targetNode) {
                return { packageName: targetNode.packageName, slug: targetNode.slug };
            }
        }

        const packageOrder = orderedPackageCandidates(currentPackage, reference.packageName, this.listPackages());

        for (const pkgName of packageOrder) {
            const pkg = this.getPackage(pkgName);
            if (!pkg) {
                continue;
            }

            const resolved = resolveWithinPackage(reference, pkg);
            if (resolved) {
                return { packageName: pkg.manifest.name, slug: resolved.slug };
            }
        }

        if (reference.qualifiedName) {
            const node = findByQualifiedName(this.collection.packages, reference.qualifiedName);
            if (node) {
                return { packageName: node.packageName, slug: node.slug };
            }
        }

        return {};
    }
}

const tokenizeQuery = (query: string): string[] =>
    query
        .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
        .split(/[^a-zA-Z0-9]+/gu)
        .filter(Boolean)
        .map((token) => token.toLowerCase());

const SCORE_NAME_EXACT = 8;
const SCORE_QNAME_EXACT = 10;
const SCORE_TOKEN_MATCH = 4;
const SCORE_TOKEN_PREFIX = 2;
const SCORE_ALIAS_EXACT = 9;
const SCORE_FILE_EXACT = 5;
const SCORE_PACKAGE_MATCH = 3;
const SCORE_SLUG_EXACT = 7;
const SCORE_SLUG_PREFIX = 3;
const KIND_SCORE_DEFAULT = 4;
const KIND_SCORE_TABLE: Partial<Record<ReflectionKind, number>> = {
    [ReflectionKind.Class]: 18,
    [ReflectionKind.Interface]: 16,
    [ReflectionKind.TypeAlias]: 15,
    [ReflectionKind.Enum]: 14,
    [ReflectionKind.Function]: 13,
    [ReflectionKind.Constructor]: 12,
    [ReflectionKind.Method]: 11,
    [ReflectionKind.Accessor]: 10,
    [ReflectionKind.Property]: 9,
    [ReflectionKind.EnumMember]: 7,
    [ReflectionKind.Variable]: 7,
    [ReflectionKind.TypeParameter]: 6,
    [ReflectionKind.Project]: 1,
    [ReflectionKind.Module]: 6,
    [ReflectionKind.Namespace]: 6,
    [ReflectionKind.CallSignature]: 10,
    [ReflectionKind.ConstructorSignature]: 10,
    [ReflectionKind.IndexSignature]: 8,
    [ReflectionKind.GetSignature]: 10,
    [ReflectionKind.SetSignature]: 10
};

const collator = new Intl.Collator(undefined, { sensitivity: 'accent', usage: 'search' });

const safeEquals = (value: string | undefined, token: string): boolean =>
    typeof value === 'string' && value.length > 0 && collator.compare(value.toLowerCase(), token) === 0;

const tokenizeSlug = (slug: string): Set<string> => {
    if (!slug) {
        return new Set();
    }

    const parts = slug
        .split(/[^a-zA-Z0-9]+/gu)
        .filter(Boolean)
        .map((part) => part.toLowerCase());

    return new Set(parts);
};

const hasSlugPrefix = (tokens: Set<string>, candidate: string): boolean => {
    for (const token of tokens) {
        if (token.startsWith(candidate)) {
            return true;
        }
    }

    return false;
};

const getKindWeight = (kind: ReflectionKind): number => KIND_SCORE_TABLE[kind] ?? KIND_SCORE_DEFAULT;

const aggregateSearchIndex = (collection: DocCollection): DocSearchEntry[] =>
    collection.packages.flatMap((pkg) => pkg.indexes.search);

const orderedPackageCandidates = (
    currentPackage: string,
    hintedPackage: string | undefined,
    available: string[]
): string[] => {
    const ordered = new Set<string>();

    if (hintedPackage) {
        ordered.add(hintedPackage);
    }

    if (currentPackage) {
        ordered.add(currentPackage);
    }

    for (const name of available) {
        ordered.add(name);
    }

    return Array.from(ordered);
};

const resolveWorkspaceRoot = (explicit: string | undefined, anchor: string): string => {
    if (explicit) {
        return path.resolve(explicit);
    }

    return findWorkspaceRoot(anchor);
};

const findWorkspaceRoot = (startDir: string): string => {
    const origin = path.resolve(startDir);
    let cursor = origin;
    let lastPackageDir: string | null = null;

    for (;;) {
        const workspaceMarker = path.join(cursor, 'pnpm-workspace.yaml');
        if (existsSync(workspaceMarker)) {
            return cursor;
        }

        const packageJsonPath = path.join(cursor, 'package.json');
        if (existsSync(packageJsonPath)) {
            lastPackageDir = cursor;
        }

        const parent = path.dirname(cursor);
        if (parent === cursor) {
            return lastPackageDir ?? origin;
        }

        cursor = parent;
    }
};

const resolveWithinPackage = (reference: DocReference, pkg: DocPackageModel): DocNode | null => {
    if (reference.qualifiedName) {
        const byQName = pkg.indexes.byQName.get(reference.qualifiedName);
        if (byQName) {
            return byQName;
        }
    }

    for (const node of pkg.indexes.byQName.values()) {
        if (node.qualifiedName === reference.name) return node;
    }

    return null;
};

const findByQualifiedName = (packages: DocPackageModel[], qualifiedName: string): DocNode | null => {
    for (const pkg of packages) {
        const node = pkg.indexes.byQName.get(qualifiedName);
        if (node) {
            return node;
        }
    }

    return null;
};
