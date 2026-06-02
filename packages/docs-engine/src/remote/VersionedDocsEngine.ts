import { PackageVersionNotFoundError } from '@remote/errors';
import { IndexLoader } from '@remote/index-loader';
import { deserializeProject } from '@remote/project-file';
import { ProjectLoader } from '@remote/project-loader';
import {
    crossPackageUrlRef,
    findByQualifiedName,
    orderedPackageCandidates,
    resolveWithinPackage
} from '@routing/resolve-helpers';
import { DocSearch } from '@services/Search';

import type { IndexJson, PackageIndexEntry } from '@remote/index-json';
import type { Fetcher } from '@remote/index-loader';
import type { GlobalId } from '@src/ids';
import type { DirectorySnapshot, PackageDirectory } from '@src/PackageDirectory';
import type { DocCollection, DocManifest, DocNode, DocPackageModel, DocReference, DocSearchEntry } from '@src/types';

export interface ReferenceResolution {
    packageName?: string;
    slug?: string;
    externalUrl?: string;
}

const defaultFetcher: Fetcher = (url) => globalThis.fetch(url);

/**
 * Version-aware engine for the remote (jsDelivr) docs. Holds one loaded model per package, keyed by
 * full name; `setVersion(folder, selector)` fetches and swaps a single package's active version.
 * Search and reference resolution are scoped to the loaded set; a reference into an unloaded package
 * resolves to a cross-package URL via {@link crossPackageUrlRef}. Construct one per request: it carries
 * mutable per-package state and must not be shared across requests.
 */
export class VersionedDocsEngine {
    private readonly models = new Map<string, DocPackageModel>();
    private readonly active = new Map<string, string>();
    private readonly byKey = new Map<GlobalId, DocNode>();
    private docSearch: DocSearch | null = null;
    private index: IndexJson | null = null;

    constructor(
        private readonly indexLoader: IndexLoader = new IndexLoader(),
        private readonly fetcher: Fetcher = defaultFetcher
    ) {}

    async ready(force = false): Promise<IndexJson> {
        if (!this.index || force) {
            this.index = await this.indexLoader.load(force);
        }
        return this.index;
    }

    async listPackages(): Promise<{ folder: string; fullName: string }[]> {
        return this.indexLoader.listPackages(await this.ready());
    }

    async getEntry(folder: string): Promise<PackageIndexEntry | null> {
        return this.indexLoader.getEntry(await this.ready(), folder);
    }

    async setVersion(folder: string, selector: string): Promise<void> {
        const index = await this.ready();
        const entry = this.indexLoader.getEntry(index, folder);
        if (!entry) {
            throw new PackageVersionNotFoundError(folder, selector);
        }

        const resolved = this.indexLoader.resolveVersion(entry, selector);
        if (!resolved) {
            throw new PackageVersionNotFoundError(folder, selector);
        }

        const url = this.indexLoader.buildProjectUrl(index, folder, resolved.version, resolved.channel);
        const model = deserializeProject(await new ProjectLoader(url, this.fetcher).load());

        this.models.set(model.manifest.name, model);
        this.active.set(model.manifest.name, resolved.version);
        this.rebuild();
    }

    activeVersion(packageName: string): string | null {
        return this.active.get(packageName) ?? null;
    }

    loadedPackages(): string[] {
        return Array.from(this.models.keys());
    }

    getPackage(packageName: string): DocPackageModel | null {
        return this.models.get(packageName) ?? null;
    }

    getPackageDirectory(packageName: string): PackageDirectory | null {
        return this.models.get(packageName)?.directory ?? null;
    }

    listPackageEntities(packageName: string): DirectorySnapshot | null {
        return this.getPackageDirectory(packageName)?.snapshot() ?? null;
    }

    getNodeBySlug(packageName: string, slug: string): DocNode | null {
        return this.models.get(packageName)?.indexes.bySlug.get(slug) ?? null;
    }

    // Same lookup as getNodeBySlug here (only loaded packages exist), kept distinct so
    // resolveReferenceHref can run against this engine or DocsEngine through one interface.
    getNodeByGlobalSlug(packageName: string, slug: string): DocNode | null {
        return this.models.get(packageName)?.indexes.bySlug.get(slug) ?? null;
    }

    getNodeByQualifiedName(packageName: string, qualifiedName: string): DocNode | null {
        return this.models.get(packageName)?.indexes.byQName.get(qualifiedName) ?? null;
    }

    getNodeByKey(key: GlobalId): DocNode | null {
        return this.byKey.get(key) ?? null;
    }

    search(query: string, packageName?: string): DocSearchEntry[] {
        return this.docSearch ? this.docSearch.search(query, packageName) : [];
    }

    resolveReference(currentPackage: string, reference: DocReference | null): ReferenceResolution {
        if (!reference) {
            return {};
        }
        if (reference.externalUrl) {
            return { externalUrl: reference.externalUrl };
        }

        if (reference.targetKey) {
            const node = this.getNodeByKey(reference.targetKey);
            if (node) {
                return { packageName: node.packageName, slug: node.slug };
            }
        }

        for (const name of orderedPackageCandidates(currentPackage, reference.packageName, this.loadedPackages())) {
            const pkg = this.models.get(name);
            if (!pkg) continue;
            const resolved = resolveWithinPackage(reference, pkg);
            if (resolved) {
                return { packageName: pkg.manifest.name, slug: resolved.slug };
            }
        }

        if (reference.qualifiedName) {
            const node = findByQualifiedName(Array.from(this.models.values()), reference.qualifiedName);
            if (node) {
                return { packageName: node.packageName, slug: node.slug };
            }
        }

        // Target package not loaded, so it has no node to resolve against; fall back to a package URL.
        return crossPackageUrlRef(reference);
    }

    private rebuild(): void {
        this.byKey.clear();
        for (const model of this.models.values()) {
            for (const node of model.indexes.byId.values()) {
                this.byKey.set(node.key, node);
            }
        }
        this.docSearch = new DocSearch(this.collection());
    }

    private collection(): DocCollection {
        const packages = Array.from(this.models.values());
        return {
            manifest: emptyManifest(packages.map((pkg) => pkg.manifest)),
            packages,
            byKey: this.byKey,
            byGlobalSlug: new Map<string, DocNode>()
        };
    }
}

function emptyManifest(packages: DocManifest['packages']): DocManifest {
    return { generatedAt: '', tool: '', apiExtractorVersion: '', outputDir: '', packages };
}
