import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { isPlainObject } from 'es-toolkit';

import { posixRelative } from '#src/lib/paths';
import { ReleaseName } from '#src/release/ReleaseName';
import { releaseTags } from '#src/release/releaseTags';

import type { PublishedPackage } from '#src/lib/published-packages';
import type { Workspace } from '#src/lib/Workspace';
import type { Package } from '@manypkg/get-packages';

const run = promisify(execFile);

async function readPackageAt(
    cwd: string,
    ref: string,
    file: string
): Promise<Pick<Package['packageJson'], 'name' | 'version' | 'private'>> {
    const source = `${ref}:${file}`;
    const { stdout } = await run('git', ['show', source], { cwd });
    const manifest: unknown = JSON.parse(stdout);

    if (!isPlainObject(manifest) || typeof manifest.name !== 'string' || typeof manifest.version !== 'string') {
        throw new TypeError(`${source} must contain a string name and version`);
    }

    return { name: manifest.name, version: manifest.version, private: manifest.private === true };
}

export async function readReleasePackages(workspace: Workspace, since?: string): Promise<PublishedPackage[]> {
    const git = async (...args: string[]): Promise<string> => {
        const { stdout } = await run('git', args, { cwd: workspace.rootDir });
        return stdout;
    };
    const tags = await releaseTags(workspace.rootDir, '--merged', 'HEAD', '--no-contains', 'HEAD');
    const base = since ?? ReleaseName.latestIn(tags);
    const tree = base === undefined ? '' : await git('ls-tree', '-r', '--name-only', '-z', base);
    const files = new Set(tree.split('\0'));
    const entries: PublishedPackage[] = [];

    for (const pkg of workspace.published()) {
        const { name, version } = pkg.packageJson;
        const file = posixRelative(workspace.rootDir, path.join(pkg.dir, 'package.json'));

        if (base !== undefined && files.has(file)) {
            const previous = await readPackageAt(workspace.rootDir, base, file);
            const unchanged = previous.private !== true && previous.name === name && previous.version === version;

            if (unchanged) continue;
        }

        entries.push({ name, version });
    }

    return entries.toSorted((left, right) => left.name.localeCompare(right.name));
}
