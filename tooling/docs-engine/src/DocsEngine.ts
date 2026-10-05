import { existsSync } from 'node:fs';
import path from 'node:path';

import { buildCollection, type ResolveOptions } from '#builders/collection-builder';
import { DocSearch } from '#services/Search';
import { resolveManifestPath } from '#src/constants';
import { ManifestReader } from '#src/ManifestReader';

import type { GlobalId } from '#src/ids';
import type { DirectorySnapshot, PackageDirectory } from '#src/PackageDirectory';
import type { DocCollection, DocManifest, DocNode, DocPackageModel, DocSearchEntry } from '#src/types';

export interface DocsEngineOptions {
    generatedRoot: string;
    manifestPath?: string;
    manifest?: DocManifest;
}

export class DocsEngine {
    private readonly docSearch: DocSearch;
    private readonly directories: Map<string, PackageDirectory>;

    private constructor(private readonly collection: DocCollection) {
        this.docSearch = new DocSearch(collection.packages.flatMap((pkg) => pkg.indexes.search));
        this.directories = new Map(collection.packages.map((pkg) => [pkg.manifest.name, pkg.listed] as const));
    }

    static async create(options: DocsEngineOptions): Promise<DocsEngine> {
        const generatedRoot = path.resolve(options.generatedRoot);
        const manifestPath = resolveManifestPath(generatedRoot, options.manifestPath);
        let manifest = options.manifest;
        if (!manifest) {
            const reader = new ManifestReader({ rootDir: generatedRoot, manifestPath });
            manifest = await reader.read();
        }
        const workspaceRoot = findWorkspaceRoot(generatedRoot);
        const manifestDir = path.dirname(manifestPath);

        return DocsEngine.fromManifest(manifest, {
            ...(workspaceRoot !== undefined && { workspaceRoot }),
            manifestDir,
            manifestOutputDir: manifest.outputDir,
            generatedRoot
        });
    }

    static fromManifest(manifest: DocManifest, resolve: ResolveOptions): DocsEngine {
        return new DocsEngine(buildCollection(manifest, resolve));
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
}

function findWorkspaceRoot(startDir: string): string | undefined {
    let dir = startDir;
    let checked: string;
    do {
        if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;

        checked = dir;
        dir = path.dirname(dir);
    } while (dir !== checked);

    return undefined;
}
