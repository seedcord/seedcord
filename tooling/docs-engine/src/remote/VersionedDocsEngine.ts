import { PackageVersionNotFoundError } from '#remote/errors';
import { IndexLoader } from '#remote/index-loader';
import { deserializeProject } from '#remote/project-file';
import { ProjectLoader } from '#remote/project-loader';
import { AnchorStrategy } from '#routing/AnchorStrategy';
import { ReferenceResolver } from '#routing/ReferenceResolver';
import { orderedPackageCandidates } from '#routing/resolve-helpers';
import { DocSearch } from '#services/Search';

import type { IndexJson, PackageIndexEntry } from '#remote/index-json';
import type { Fetcher } from '#remote/index-loader';
import type { CrossPackageEntity, NodeLookup, PackageRegistry } from '#routing/lookup';
import type { GlobalId } from '#src/ids';
import type { DirectorySnapshot, PackageDirectory } from '#src/PackageDirectory';
import type { DocCollection, DocManifest, DocNode, DocPackageModel, DocSearchEntry } from '#src/types';

const defaultFetcher: Fetcher = (url) => globalThis.fetch(url);

// a built model is immutable
const sharedModelCache = new Map<string, DocPackageModel>();

/**
 * Version-aware engine for the remote (R2) docs. Holds one loaded model per package, keyed by
 * full name. `setVersion(folder, selector)` fetches and swaps a single package's active version.
 * Search and reference resolution are scoped to the loaded set. Resolution runs through the shared
 * {@link ReferenceResolver} via `resolver()`. Construct one per request. It carries mutable per-package
 * state and must not be shared across requests.
 */
export class VersionedDocsEngine implements NodeLookup, PackageRegistry {
    private readonly models = new Map<string, DocPackageModel>();
    private readonly active = new Map<string, string>();
    private readonly byKey = new Map<GlobalId, DocNode>();
    private docSearch: DocSearch | null = null;
    private index: IndexJson | null = null;
    private resolverInstance: ReferenceResolver | null = null;
    private dirty = false;

    constructor(
        private readonly indexLoader: IndexLoader = new IndexLoader(),
        private readonly fetcher: Fetcher = defaultFetcher,
        private readonly modelCache: Map<string, DocPackageModel> = sharedModelCache
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
        const model = await this.loadModel(url);

        this.models.set(model.manifest.name, model);
        this.active.set(model.manifest.name, resolved.version);
        this.dirty = true;
    }

    private async loadModel(url: string): Promise<DocPackageModel> {
        const cached = this.modelCache.get(url);
        if (cached) return cached;
        const model = deserializeProject(await new ProjectLoader(url, this.fetcher).load());
        this.modelCache.set(url, model);
        return model;
    }

    activeVersion(packageName: string): string | null {
        return this.active.get(packageName) ?? null;
    }

    loadedPackages(): string[] {
        return [...this.models.keys()];
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

    // same lookup as getNodeBySlug here. the two differ on DocsEngine, which ReferenceResolver also
    // runs against through NodeLookup.
    getNodeByGlobalSlug(packageName: string, slug: string): DocNode | null {
        return this.models.get(packageName)?.indexes.bySlug.get(slug) ?? null;
    }

    getNodeByQualifiedName(packageName: string, qualifiedName: string): DocNode | null {
        return this.models.get(packageName)?.indexes.byQName.get(qualifiedName) ?? null;
    }

    getNodeByKey(key: GlobalId): DocNode | null {
        this.ensureBuilt();
        return this.byKey.get(key) ?? null;
    }

    search(query: string, packageName?: string): DocSearchEntry[] {
        this.ensureBuilt();
        return this.docSearch ? this.docSearch.search(query, packageName) : [];
    }

    resolver(): ReferenceResolver {
        this.resolverInstance ??= new ReferenceResolver(this, this, new AnchorStrategy(this));
        return this.resolverInstance;
    }

    candidatePackages(currentPackage: string, hinted?: string): string[] {
        return orderedPackageCandidates(currentPackage, hinted, this.loadedPackages());
    }

    isKnownPackage(fullName: string): boolean {
        return this.entryByFullName(fullName) !== null;
    }

    crossPackageEntity(fullName: string, slug: string): CrossPackageEntity | null {
        const entry = this.entryByFullName(fullName);
        return entry ? entityFromEntry(entry, slug, this.active.get(fullName)) : null;
    }

    private entryByFullName(fullName: string): PackageIndexEntry | null {
        if (!this.index) return null;
        for (const entry of Object.values(this.index.packages)) {
            if (entry.fullName === fullName) return entry;
        }
        return null;
    }

    // deferred so several setVersion calls cost one rebuild, and a slug-only render builds nothing
    private ensureBuilt(): void {
        if (!this.dirty) return;
        this.rebuild();
        this.dirty = false;
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
        const packages = [...this.models.values()];
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

function entityFromEntry(entry: PackageIndexEntry, slug: string, activeVersion?: string): CrossPackageEntity | null {
    const segments = slug.split('/');
    const entitySlug = segments[0];
    if (!entitySlug) return null;

    const tone = entry.entities?.[entitySlug];
    if (!tone) return null;

    // stay on the version the reader is viewing
    const version = activeVersion ?? entry.stable?.latest ?? entry.prerelease?.latest;
    if (!version) return null;

    const fragment = segments.length > 1 ? segments[1] : undefined;
    return fragment ? { tone, version, entitySlug, fragment } : { tone, version, entitySlug };
}
