import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PROJECT_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
const PACKAGE_FIELDS = ['dependencies', 'peerDependencies'] as const;

function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
}

function readManifest(path: string): unknown {
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
}

function dependencyNames(manifest: unknown, fields: readonly string[]): string[] {
    if (!isObject(manifest)) return [];
    return fields.flatMap((field) => {
        const deps: unknown = Reflect.get(manifest, field);
        return isObject(deps) ? Object.keys(deps) : [];
    });
}

// a monorepo can hoist the package above the project
function findManifest(projectDir: string, name: string): unknown {
    for (let dir = projectDir; ; dir = dirname(dir)) {
        const manifest = readManifest(join(dir, 'node_modules', name, 'package.json'));
        if (manifest !== undefined) return manifest;
        if (dirname(dir) === dir) return undefined;
    }
}

function isSeedcordPackage(name: string): boolean {
    return name.startsWith('@seedcord/');
}

export function seedcordDependents(projectDir: string): string[] {
    const names = dependencyNames(readManifest(join(projectDir, 'package.json')), PROJECT_FIELDS);

    return names.filter(
        (name) =>
            !isSeedcordPackage(name) &&
            dependencyNames(findManifest(projectDir, name), PACKAGE_FIELDS).some(isSeedcordPackage)
    );
}
