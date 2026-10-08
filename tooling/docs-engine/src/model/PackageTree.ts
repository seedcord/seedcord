import { ApiExportedMixin, type ApiItem, type ApiModel, type ApiPackage } from '@microsoft/api-extractor-model';
import { RuntimeBuild } from '@seedcord/docs-generator/runtime-build';

import { groupOverloads, synthGroups } from '#model/adapter-helpers';
import { apiKindToDocKind } from '#model/kinds';

import type { ApiAdapter } from '#model/ApiAdapter';
import type { DocNode } from '#src/types';

// one entry point of a package, its `exports` map subpath paired with that subpath's own API model
export interface AdapterEntry {
    subpath: string;
    condition?: string;
    // exports a runtime build declares in place of the default build's, from the generator's source scan
    ownVersions?: ReadonlySet<string>;
    apiPackage: ApiPackage;
    model: ApiModel;
    // keys the package root really exports, set when `apiPackage` is the widened shared model
    rootExports?: ReadonlySet<string>;
}

export function entryMembers(apiPackage: ApiPackage): readonly ApiItem[] {
    return apiPackage.entryPoints[0]?.members ?? [];
}

// `export const X` and `export interface X` are two doc nodes under one name
const nodeKey = (kind: number, name: string): string => `${kind}:${name}`;

const memberKey = (member: ApiItem): string => nodeKey(apiKindToDocKind(member), member.displayName);

const exportsMember = (member: ApiItem): boolean => (ApiExportedMixin.isBaseClassOf(member) ? member.isExported : true);

// groupOverloads matches how the adapter builds nodes
export function exportedKeysOf(apiPackage: ApiPackage): Set<string> {
    return groupOverloads(entryMembers(apiPackage)).reduce<Set<string>>((acc, [primary]) => {
        if (primary && exportsMember(primary)) acc.add(memberKey(primary));
        return acc;
    }, new Set());
}

type OverloadGroup = readonly ApiItem[];

// The root entry supplies the package node and its members. Each later entry adds only the symbols
// no earlier one exported. A symbol several subpaths re-export is one node listing all of them.
// A runtime build's own class under a default-build name, like the edge `Seedcord`, gets its own node.
export class PackageTree {
    private readonly root: DocNode;
    private readonly byKey = new Map<string, DocNode>();

    static build(adapter: ApiAdapter, entries: readonly AdapterEntry[]): DocNode {
        const [root, ...rest] = entries;
        if (!root) throw new Error('PackageTree.build needs at least one entry point.');

        const tree = new PackageTree(adapter, root);
        for (const entry of rest) tree.merge(entry);
        return tree.finish();
    }

    private constructor(
        private readonly adapter: ApiAdapter,
        root: AdapterEntry
    ) {
        this.root = adapter.transform(root.apiPackage);
        for (const child of this.root.children) {
            const key = nodeKey(child.kind, child.name);
            // includeForgottenExports pulls in declarations no entry point exports
            if (child.isExported && (!root.rootExports || root.rootExports.has(key))) child.entries = [root.subpath];
            this.byKey.set(key, child);
        }
    }

    private merge(entry: AdapterEntry): void {
        const unseen: OverloadGroup[] = [];
        const ownDeclarations: OverloadGroup[] = [];
        for (const group of groupOverloads(entryMembers(entry.apiPackage))) {
            const [primary] = group;
            if (!primary) continue;
            const node = this.byKey.get(memberKey(primary));
            if (!node) unseen.push(group);
            else if (entry.ownVersions?.has(primary.displayName)) ownDeclarations.push(group);
            else if (exportsMember(primary)) addEntry(node, entry.subpath);
        }

        for (const node of this.adapt(entry, unseen, RuntimeBuild.default)) {
            this.byKey.set(nodeKey(node.kind, node.name), node);
        }
        this.adapt(entry, ownDeclarations, new RuntimeBuild(entry.condition));
    }

    private finish(): DocNode {
        this.root.groups = synthGroups(this.root.children);
        return this.root;
    }

    // pass every overload. visitMembers regroups them.
    private adapt(entry: AdapterEntry, groups: readonly OverloadGroup[], build: RuntimeBuild): DocNode[] {
        const nodes = this.adapter.forEntry(entry.model, build).adapt(groups.flat());
        for (const node of nodes) {
            if (node.isExported) node.entries = [entry.subpath];
            this.root.children.push(node);
        }
        return nodes;
    }
}

// the root model can carry this as a forgotten declaration while the subpath exports it
function addEntry(node: DocNode, subpath: string): void {
    node.isExported = true;
    const entries = (node.entries ??= []);
    if (!entries.includes(subpath)) entries.push(subpath);
}
