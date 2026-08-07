import type { GlobalId } from '@src/ids';
import type { EntityTone } from '@src/tones';
import type { DocNode, DocPackageModel } from '@src/types';

// Callers keep the `getNodeByGlobalSlug(...) ?? getNodeBySlug(...)` fallback. The lazy engine aliases
// the two, so either can return a node where the other returns null.
export interface NodeLookup {
    getNodeByKey(key: GlobalId): DocNode | null;
    getNodeBySlug(packageName: string, slug: string): DocNode | null;
    getNodeByGlobalSlug(packageName: string, slug: string): DocNode | null;
    getNodeByQualifiedName(packageName: string, qualifiedName: string): DocNode | null;
    getPackage(packageName: string): DocPackageModel | null;
}

// Cross-package URL parts read straight from the index, bypassing a loaded model (`logger/debug` ->
// entitySlug `logger`, fragment `debug`).
export interface CrossPackageEntity {
    tone: EntityTone;
    version: string;
    entitySlug: string;
    fragment?: string;
}

export interface PackageRegistry {
    // True for any package with docs, loaded or not. The cross-package URL fallback needs this wider
    // set than the loaded-only candidatePackages below.
    isKnownPackage(fullName: string): boolean;
    // Ordered: hinted, then current, then the loaded set.
    candidatePackages(currentPackage: string, hinted?: string): string[];
    // Returns `slug`'s URL parts when its entity is listed in `fullName`'s index entry. A param or
    // predicate slug returns null, since only real entities get indexed.
    crossPackageEntity(fullName: string, slug: string): CrossPackageEntity | null;
}

export type RefTarget =
    | { kind: 'internal'; packageName: string; slug: string }
    | { kind: 'external'; url: string }
    | { kind: 'unresolved' };
