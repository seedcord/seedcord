import { existsSync, readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { isPlainObject } from '@seedcord/utils/internal';

const PROJECT_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
const PACKAGE_FIELDS = ['dependencies', 'peerDependencies'] as const;

function dependencyNames(manifestPath: string, fields: readonly string[]): string[] {
    const manifest: unknown = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : undefined;
    if (!isPlainObject(manifest)) return [];

    return fields.flatMap((field) => {
        const deps = manifest[field];
        return isPlainObject(deps) ? Object.keys(deps) : [];
    });
}

function installedManifest(name: string, fromManifest: string): string | undefined {
    try {
        return findPackageJSON(name, pathToFileURL(fromManifest));
    } catch (error) {
        // node throws this for a package that isn't installed
        if (Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND') return undefined;
        throw error;
    }
}

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

    const collect = (manifestPath: string, fields: readonly string[]): void => {
        if (edges.has(manifestPath)) return;
        const children = new Map<string, string>();
        edges.set(manifestPath, children);

        for (const name of dependencyNames(manifestPath, fields)) {
            if (isSeedcordPackage(name)) listsSeedcord.add(manifestPath);

            const depManifest = installedManifest(name, manifestPath);
            if (depManifest === undefined) continue;
            children.set(name, depManifest);
            collect(depManifest, PACKAGE_FIELDS);
        }
    };

    collect(join(projectDir, 'package.json'), PROJECT_FIELDS);
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
