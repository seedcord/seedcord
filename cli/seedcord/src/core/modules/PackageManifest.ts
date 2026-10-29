import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { isPlainObject } from '@seedcord/utils/internal';

export const PROJECT_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

export class PackageManifest {
    private constructor(
        public readonly path: string,
        private readonly json: Readonly<Record<string, unknown>>
    ) {}

    public static read(path: string): PackageManifest {
        const json: unknown = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
        return new PackageManifest(path, isPlainObject(json) ? json : {});
    }

    // bun doesn't have findPackageJSON
    public static findInstalled(name: string, fromDir: string): string | undefined {
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

    public static packageNameOf(file: string): string | undefined {
        for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
            // a nested dist/package.json often holds only "type"
            const { name } = PackageManifest.read(join(dir, 'package.json'));
            if (name !== undefined) return name;
        }
        return undefined;
    }

    public get name(): string | undefined {
        return typeof this.json.name === 'string' ? this.json.name : undefined;
    }

    // where "seedcord": { "templates": "./templates" } points, for a plugin that ships templates
    public get templatesFolder(): string | undefined {
        const { seedcord } = this.json;
        if (!isPlainObject(seedcord) || typeof seedcord.templates !== 'string') return undefined;
        return join(dirname(this.path), seedcord.templates);
    }

    public dependencyNames(fields: readonly string[]): string[] {
        return fields.flatMap((field) => {
            const deps = this.json[field];
            return isPlainObject(deps) ? Object.keys(deps) : [];
        });
    }

    public installedDependencies(fields: readonly string[]): Map<string, PackageManifest> {
        const installed = new Map<string, PackageManifest>();
        for (const name of this.dependencyNames(fields)) {
            const path = PackageManifest.findInstalled(name, dirname(this.path));
            if (path !== undefined) installed.set(name, PackageManifest.read(path));
        }
        return installed;
    }
}

export function directDependencies(projectDir: string): ReadonlyMap<string, PackageManifest> {
    return PackageManifest.read(join(projectDir, 'package.json')).installedDependencies(PROJECT_FIELDS);
}
