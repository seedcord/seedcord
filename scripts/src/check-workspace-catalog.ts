/* eslint-disable no-console -- CLI script */
import path from 'node:path';
import process from 'node:process';

import { CatalogRule } from '#src/catalog/CatalogRule';
import { DependencyIndex, distinctPackages } from '#src/catalog/DependencyIndex';
import { Workspace } from '#src/lib/Workspace';

import type { Violation } from '#src/catalog/CatalogRule';

function advice(violation: Violation): string {
    if (violation.reason === 'duplicate-literal') {
        return (
            `      → Move "${violation.depName}" into pnpm-workspace.yaml under catalogs.deps (or .peer for peerDeps),\n` +
            `        then replace every literal version above with "catalog:deps" / "catalog:peer".`
        );
    }

    if (violation.reason === 'catalog-missing-entry') {
        return `      → A package references catalog:* for "${violation.depName}" but no catalog entry exists in pnpm-workspace.yaml.`;
    }

    const count = distinctPackages(violation.refs);
    const usedBy = count === 1 ? '1 package' : `${String(count)} packages`;

    return (
        `      → Catalog entry "${violation.depName}" is used by ${usedBy}. Catalog is for shared deps (≥2 packages).\n` +
        `        Either inline the version in the package that uses it, or remove the catalog entry.`
    );
}

function report(violations: readonly Violation[], repoRoot: string): void {
    if (violations.length === 0) {
        console.log('Workspace catalog check passed.');
        return;
    }

    console.error(
        `Workspace catalog check failed. ${String(violations.length)} dep(s) violate the catalog rule.\n` +
            `A dep two or more packages use goes in the pnpm-workspace.yaml catalog, and one only a single package uses stays inline.\n`
    );

    for (const violation of violations) {
        console.error(`  • ${violation.depName}  (${violation.reason})`);
        for (const ref of violation.refs) {
            console.error(`      ${path.relative(repoRoot, ref.packageJsonPath)}  ${ref.field}: ${ref.version}`);
        }
        console.error(advice(violation));
    }

    process.exitCode = 1;
}

const workspace = await Workspace.load(import.meta.dirname);
const index = DependencyIndex.read(workspace.packageJsonPaths());
const rule = CatalogRule.fromWorkspaceFile(path.join(workspace.rootDir, 'pnpm-workspace.yaml'));

report(rule.violations(index), workspace.rootDir);
