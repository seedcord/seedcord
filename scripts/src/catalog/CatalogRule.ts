import { readFileSync } from 'node:fs';

import { parse } from 'yaml';

import { distinctPackages } from '#src/catalog/DependencyIndex';

import type { DependencyIndex, DepRef } from '#src/catalog/DependencyIndex';

export interface Violation {
    depName: string;
    refs: readonly DepRef[];
    reason: 'duplicate-literal' | 'catalog-missing-entry' | 'catalog-underused';
}

// the Next apps pin eslint 9 until eslint-config-next supports eslint 10
const IGNORED: ReadonlySet<string> = new Set(['eslint']);

// peer ranges that a package publishes wider than the version the workspace installs
const WIDENED_PEERS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ['discord-component-embed', new Set(['react'])]
]);

function isWidenedPeer(depName: string, ref: DepRef): boolean {
    return (
        ref.field === 'peerDependencies' &&
        ref.packageName !== undefined &&
        (WIDENED_PEERS.get(ref.packageName)?.has(depName) ?? false)
    );
}

export class CatalogRule {
    static fromWorkspaceFile(filePath: string): CatalogRule {
        return CatalogRule.fromYaml(readFileSync(filePath, 'utf8'));
    }

    static fromYaml(text: string): CatalogRule {
        // justified: pnpm-workspace.yaml keeps catalogs as name to version maps
        const parsed = parse(text) as { catalogs?: Record<string, Record<string, string>> } | null;
        const buckets = Object.values(parsed?.catalogs ?? {});

        return new CatalogRule(new Set(buckets.flatMap((bucket) => Object.keys(bucket))));
    }

    constructor(private readonly entries: ReadonlySet<string>) {}

    violations(index: DependencyIndex): Violation[] {
        const found: Violation[] = [];
        const flagged = new Set<string>();

        for (const depName of index.names()) {
            if (IGNORED.has(depName)) continue;

            const refs = index.refsFor(depName);
            if (distinctPackages(refs) < 2) continue;

            if (refs.some((one) => !isInternal(one.version) && !isWidenedPeer(depName, one))) {
                found.push({ depName, refs, reason: 'duplicate-literal' });
                flagged.add(depName);
                continue;
            }

            if (!(refs.some((one) => one.version.startsWith('catalog:')) && !this.entries.has(depName))) {
                continue;
            }

            found.push({ depName, refs, reason: 'catalog-missing-entry' });
            flagged.add(depName);
        }

        for (const entry of this.entries) {
            if (IGNORED.has(entry) || flagged.has(entry)) continue;

            const refs = index.refsFor(entry).filter((one) => one.version.startsWith('catalog:'));
            if (distinctPackages(refs) < 2) found.push({ depName: entry, refs, reason: 'catalog-underused' });
        }

        return found;
    }
}

function isInternal(version: string): boolean {
    return version.startsWith('workspace:') || version.startsWith('catalog:');
}
