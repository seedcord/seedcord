import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { isPlainObject } from '@seedcord/utils/internal';

export const PROJECT_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

// bun doesn't have findPackageJSON
export function installedManifest(name: string, fromDir: string): string | undefined {
    let dir = fromDir;
    let checked: string;
    do {
        const candidate = join(dir, 'node_modules', name, 'package.json');
        // pnpm stores a package's dependencies beside its real folder
        if (existsSync(candidate)) return realpathSync(candidate);

        checked = dir;
        dir = dirname(dir);
    } while (dir !== checked);

    return undefined;
}

export function readManifest(manifestPath: string): Record<string, unknown> | undefined {
    const manifest: unknown = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : undefined;
    return isPlainObject(manifest) ? manifest : undefined;
}

export function dependencyNames(manifestPath: string, fields: readonly string[]): string[] {
    const manifest = readManifest(manifestPath);
    return fields.flatMap((field) => {
        const deps = manifest?.[field];
        return isPlainObject(deps) ? Object.keys(deps) : [];
    });
}

// maps each dependency the project lists and has installed to its package.json
export function directDependencies(projectDir: string): Map<string, string> {
    const installed = new Map<string, string>();
    for (const name of dependencyNames(join(projectDir, 'package.json'), PROJECT_FIELDS)) {
        const manifest = installedManifest(name, projectDir);
        if (manifest !== undefined) installed.set(name, manifest);
    }
    return installed;
}
