import { existsSync } from 'node:fs';
import path from 'node:path';

import { buildCollection, type ResolveOptions } from './builders/collection-builder';
import { resolveManifestPath } from './constants';
import { ManifestReader } from './ManifestReader';
import { DocSearch } from './services/Search';

import type { GlobalId } from './ids';
import type { DirectorySnapshot, PackageDirectory } from './PackageDirectory';
import type { DocCollection, DocManifest, DocNode, DocPackageModel, DocReference, DocSearchEntry } from './types';

export interface DocsEngineOptions {
    generatedRoot: string;
    manifestPath?: string;
    workspaceRoot?: string;
    manifest?: DocManifest;
}

export class DocsEngine {
    private readonly docSearch: DocSearch;
    private readonly directories: Map<string, PackageDirectory>;

    private constructor(private readonly collection: DocCollection) {
        this.docSearch = new DocSearch(collection);
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
        return this.docSearch.search(query, pkgName);
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

function orderedPackageCandidates(
    currentPackage: string,
    hintedPackage: string | undefined,
    available: string[]
): string[] {
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
}

function resolveWorkspaceRoot(explicit: string | undefined, anchor: string): string {
    if (explicit) {
        return path.resolve(explicit);
    }

    return findWorkspaceRoot(anchor);
}

function findWorkspaceRoot(startDir: string): string {
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
}

function resolveWithinPackage(reference: DocReference, pkg: DocPackageModel): DocNode | null {
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
}

function findByQualifiedName(packages: DocPackageModel[], qualifiedName: string): DocNode | null {
    for (const pkg of packages) {
        const node = pkg.indexes.byQName.get(qualifiedName);
        if (node) {
            return node;
        }
    }

    return null;
}
