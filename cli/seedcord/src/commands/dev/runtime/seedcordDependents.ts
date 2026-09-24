import { existsSync, readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { isPlainObject } from '#utils/isPlainObject';

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

export function seedcordDependents(projectDir: string): string[] {
    const found = new Set<string>();

    const visit = (manifestPath: string, fields: readonly string[]): void => {
        for (const name of dependencyNames(manifestPath, fields)) {
            if (isSeedcordPackage(name) || found.has(name)) continue;

            const depManifest = installedManifest(name, manifestPath);
            if (depManifest === undefined) continue;
            if (!dependencyNames(depManifest, PACKAGE_FIELDS).some(isSeedcordPackage)) continue;

            found.add(name);
            visit(depManifest, PACKAGE_FIELDS);
        }
    };

    visit(join(projectDir, 'package.json'), PROJECT_FIELDS);
    return [...found];
}
