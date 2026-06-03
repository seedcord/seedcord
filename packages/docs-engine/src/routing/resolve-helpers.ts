import { Slugger, slugForNode } from '@src/Slugger';

import type { DocNode, DocPackageModel, DocReference } from '@src/types';

// Resolution priority: hinted package, then current, then the rest.
export function orderedPackageCandidates(
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

export function resolveWithinPackage(reference: DocReference, pkg: DocPackageModel): DocNode | null {
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

/**
 * Best-effort cross-package link target for the lazy engine, where the referenced package is not
 * loaded so its node cannot be looked up. The canonical qualified name joins segments with `.`/`#`,
 * while a node slug is the slash-joined path, so the path is rebuilt from those separators. A fresh
 * Slugger reproduces the un-deduplicated slug.
 */
export function crossPackageUrlRef(reference: DocReference): { packageName?: string; slug?: string } {
    if (!reference.packageName || !reference.qualifiedName) {
        return {};
    }

    const segments = reference.qualifiedName.split(/[.#]/).filter(Boolean);
    if (segments.length === 0) {
        return {};
    }

    return { packageName: reference.packageName, slug: slugForNode(new Slugger(), segments) };
}
