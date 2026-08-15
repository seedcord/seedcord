import { groupOverloads, synthGroups } from '#model/adapter-helpers';
import { apiKindToDocKind } from '#model/kinds';

import type { ApiAdapter } from '#model/adapter';
import type { DocNode } from '#src/types';
import type { ApiItem, ApiModel, ApiPackage } from '@microsoft/api-extractor-model';

/** One entry point of a package, its `exports` map subpath paired with that subpath's own API model. */
export interface AdapterEntry {
    subpath: string;
    apiPackage: ApiPackage;
    model: ApiModel;
}

export function entryMembers(apiPackage: ApiPackage): readonly ApiItem[] {
    return apiPackage.entryPoints[0]?.members ?? [];
}

// `export const X` and `export interface X` are two doc nodes under one name
const nodeKey = (kind: number, name: string): string => `${kind}:${name}`;

const memberKey = (member: ApiItem): string => nodeKey(apiKindToDocKind(member), member.displayName);

// groupOverloads matches how the adapter builds nodes
function nodeKeysOf(apiPackage: ApiPackage): string[] {
    return groupOverloads(entryMembers(apiPackage)).reduce<string[]>((acc, [primary]) => {
        if (primary) acc.push(memberKey(primary));
        return acc;
    }, []);
}

/**
 * Adapt every entry point into one package tree. The root entry supplies the package node and its
 * members. Each later subpath contributes only the symbols no earlier entry exported. A symbol several
 * subpaths re-export is one node whose `entries` lists all of them.
 */
export function mergeEntries(adapter: ApiAdapter, entries: readonly AdapterEntry[]): DocNode {
    const [root, ...subpaths] = entries;
    if (!root) throw new Error('mergeEntries needs at least one entry point.');

    const tree = adapter.transform(root.apiPackage);
    const byKey = new Map<string, DocNode>();
    for (const child of tree.children) {
        // includeForgottenExports pulls in declarations no entry point exports
        if (child.isExported) child.entries = [root.subpath];
        byKey.set(nodeKey(child.kind, child.name), child);
    }

    for (const entry of subpaths) {
        for (const key of nodeKeysOf(entry.apiPackage)) {
            byKey.get(key)?.entries?.push(entry.subpath);
        }

        // every overload of an unseen member stays in the list, since visitMembers regroups them
        const unseen = entryMembers(entry.apiPackage).filter((member) => !byKey.has(memberKey(member)));
        for (const node of adapter.adaptSubpath(entry.model, unseen)) {
            if (node.isExported) node.entries = [entry.subpath];
            tree.children.push(node);
            byKey.set(nodeKey(node.kind, node.name), node);
        }
    }

    tree.groups = synthGroups(tree.children);
    return tree;
}
