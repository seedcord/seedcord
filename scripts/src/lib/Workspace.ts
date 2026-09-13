import path from 'node:path';

import { getPackages } from '@manypkg/get-packages';

import type { Package, Packages } from '@manypkg/get-packages';

export class Workspace {
    static async load(dir: string): Promise<Workspace> {
        return new Workspace(await getPackages(dir));
    }

    constructor(private readonly snapshot: Omit<Packages, 'tool'>) {}

    get rootDir(): string {
        return this.snapshot.rootDir;
    }

    all(): readonly Package[] {
        return this.snapshot.packages;
    }

    published(): readonly Package[] {
        return this.snapshot.packages.filter((one) => one.packageJson.private !== true);
    }

    directoryOf(name: string): string | undefined {
        return this.snapshot.packages.find((one) => one.packageJson.name === name)?.dir;
    }

    packageJsonPaths(): string[] {
        const { rootPackage, packages } = this.snapshot;
        const every = rootPackage ? [rootPackage, ...packages] : packages;

        return every.map((one) => path.join(one.dir, 'package.json'));
    }
}
