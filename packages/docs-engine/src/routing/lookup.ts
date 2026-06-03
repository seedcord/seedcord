import type { GlobalId } from '@src/ids';
import type { EntityTone } from '@src/tones';
import type { DocNode, DocPackageModel } from '@src/types';

// Callers keep the `getNodeByGlobalSlug(...) ?? getNodeBySlug(...)` fallback: the lazy engine aliases
// the two, so either can return a node where the other returns null.
export interface NodeLookup {
    getNodeByKey(key: GlobalId): DocNode | null;
    getNodeBySlug(packageName: string, slug: string): DocNode | null;
    getNodeByGlobalSlug(packageName: string, slug: string): DocNode | null;
    getNodeByQualifiedName(packageName: string, qualifiedName: string): DocNode | null;
    getPackage(packageName: string): DocPackageModel | null;
}

// Cross-package URL parts read from the index, not a loaded model (`logger/debug` -> entitySlug
// `logger`, fragment `debug`).
export interface CrossPackageEntity {
    tone: EntityTone;
    version: string;
    entitySlug: string;
    fragment?: string;
}

export interface CrossPackageEntityHome extends CrossPackageEntity {
    fullName: string;
}

export interface PackageRegistry {
    // True for any package with docs, loaded or not; the cross-package URL fallback requires this wider
    // set than the loaded-only candidatePackages below.
    isKnownPackage(fullName: string): boolean;
    // Ordered: hinted, then current, then the loaded set.
    candidatePackages(currentPackage: string, hinted?: string): string[];
    // Returns `slug`'s URL parts when its entity is listed in `fullName`'s index entry; null when the
    // slug is a param/predicate/mis-attributed external rather than a real entity.
    crossPackageEntity(fullName: string, slug: string): CrossPackageEntity | null;
    // Re-home: the first package (index insertion order) whose entry lists `slug`'s entity, for when
    // API-Extractor `bundledPackages` attributes a symbol to the wrong package. First-match is arbitrary
    // only under a cross-package slug collision (rare); the prior behavior was an invalid 404 link.
    findEntityAcrossPackages(slug: string): CrossPackageEntityHome | null;
}

export type RefTarget =
    | { kind: 'internal'; packageName: string; slug: string }
    | { kind: 'external'; url: string }
    | { kind: 'unresolved' };
