import { readFileSync } from 'node:fs';

import { parse } from 'yaml';

import { distinctPackages } from '#src/catalog/DependencyIndex';

import type { DependencyIndex, DepRef } from '#src/catalog/DependencyIndex';

export type ViolationReason = 'duplicate-literal' | 'catalog-missing-entry' | 'catalog-underused';

export interface Violation {
    depName: string;
    refs: readonly DepRef[];
    reason: ViolationReason;
}

// eslint stays split until eslint-config-next supports eslint 10. The framework and cli run
// catalog eslint 10 while the Next apps pin 9.
const IGNORED: ReadonlySet<string> = new Set(['eslint']);

export class CatalogRule {
    static fromWorkspaceFile(filePath: string): CatalogRule {
        return CatalogRule.fromYaml(readFileSync(filePath, 'utf8'));
    }

    static fromYaml(text: string): CatalogRule {
        const parsed = parse(text) as { catalogs?: Record<string, Record<string, string>> } | null;
        const buckets = Object.values(parsed?.catalogs ?? {});

        return new CatalogRule(new Set(buckets.flatMap((bucket) => Object.keys(bucket))));
    }

    constructor(
        private readonly entries: ReadonlySet<string>,
        private readonly ignored: ReadonlySet<string> = IGNORED
    ) {}

    violations(index: DependencyIndex): Violation[] {
        const found: Violation[] = [];
        const flagged = new Set<string>();

        for (const depName of index.names()) {
            if (this.ignored.has(depName)) continue;

            const refs = index.refsFor(depName);
            // an optional peer is often also a devDependency
            if (distinctPackages(refs) < 2) continue;

            if (refs.some((one) => !isInternal(one.version))) {
                found.push({ depName, refs, reason: 'duplicate-literal' });
                flagged.add(depName);
                continue;
            }

            if (refs.some((one) => one.version.startsWith('catalog:')) && !this.entries.has(depName)) {
                found.push({ depName, refs, reason: 'catalog-missing-entry' });
                flagged.add(depName);
            }
        }

        for (const entry of this.entries) {
            if (this.ignored.has(entry) || flagged.has(entry)) continue;

            const refs = index.refsFor(entry).filter((one) => one.version.startsWith('catalog:'));
            if (distinctPackages(refs) < 2) found.push({ depName: entry, refs, reason: 'catalog-underused' });
        }

        return found;
    }
}

function isInternal(version: string): boolean {
    return version.startsWith('workspace:') || version.startsWith('catalog:');
}
