import path from 'node:path';

import { ChangelogFile } from '#src/release/ChangelogFile';

import type { PublishedPackage } from '#src/lib/published-packages';
import type { Workspace } from '#src/lib/Workspace';
import type { ReleasePackage } from '#src/release/ReleaseNotes';

export async function resolvePackages(
    workspace: Workspace,
    entries: readonly PublishedPackage[]
): Promise<ReleasePackage[]> {
    const resolved: ReleasePackage[] = [];

    for (const entry of entries) {
        const pkg = workspace.packageOf(entry.name);
        if (pkg === undefined) throw new Error(`${entry.name} is not a package in this workspace`);

        const changelog = await ChangelogFile.read(path.join(pkg.dir, 'CHANGELOG.md'));
        const oldVersion = changelog.versionBefore(entry.version);
        const commandOnly = 'bin' in pkg.packageJson && !('exports' in pkg.packageJson);
        resolved.push({
            name: entry.name,
            version: entry.version,
            ...(oldVersion !== undefined && { oldVersion }),
            ...(commandOnly && { commandOnly }),
            directory: path.relative(workspace.rootDir, pkg.dir),
            changelog: changelog.contents
        });
    }

    return resolved;
}
