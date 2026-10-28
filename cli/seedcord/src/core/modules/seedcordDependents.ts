import { join } from 'node:path';

import { PackageManifest, PROJECT_FIELDS } from './PackageManifest';

const PACKAGE_FIELDS = ['dependencies', 'peerDependencies'] as const;

function isSeedcordPackage(name: string): boolean {
    return name.startsWith('@seedcord/');
}

// every installed manifest the project reaches, mapped to its dependencies by name
function installedGraph(projectDir: string): {
    edges: Map<string, Map<string, string>>;
    listsSeedcord: Set<string>;
} {
    const edges = new Map<string, Map<string, string>>();
    const listsSeedcord = new Set<string>();

    const collect = (manifest: PackageManifest, fields: readonly string[]): void => {
        if (edges.has(manifest.path)) return;
        const children = new Map<string, string>();
        edges.set(manifest.path, children);

        if (manifest.dependencyNames(fields).some(isSeedcordPackage)) listsSeedcord.add(manifest.path);
        for (const [name, dependency] of manifest.installedDependencies(fields)) {
            children.set(name, dependency.path);
            collect(dependency, PACKAGE_FIELDS);
        }
    };

    collect(PackageManifest.read(join(projectDir, 'package.json')), PROJECT_FIELDS);
    return { edges, listsSeedcord };
}

// vite hands every import inside an external package to node
export function seedcordDependents(projectDir: string): string[] {
    const { edges, listsSeedcord } = installedGraph(projectDir);

    const parentsOf = new Map<string, string[]>();
    for (const [manifest, children] of edges) {
        for (const depManifest of children.values()) {
            parentsOf.set(depManifest, [...(parentsOf.get(depManifest) ?? []), manifest]);
        }
    }

    const dependsOnSeedcord = new Set(listsSeedcord);
    const queue = [...listsSeedcord];
    for (const manifest of queue) {
        for (const parent of parentsOf.get(manifest) ?? []) {
            if (dependsOnSeedcord.has(parent)) continue;
            dependsOnSeedcord.add(parent);
            queue.push(parent);
        }
    }

    const found = new Set<string>();
    for (const children of edges.values()) {
        for (const [name, depManifest] of children) {
            if (dependsOnSeedcord.has(depManifest) && !isSeedcordPackage(name)) found.add(name);
        }
    }
    return [...found];
}
