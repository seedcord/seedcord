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
        const dir = workspace.directoryOf(entry.name);
        if (dir === undefined) throw new Error(`${entry.name} is not a package in this workspace`);

        const changelog = await ChangelogFile.read(path.join(dir, 'CHANGELOG.md'));
        const oldVersion = changelog.versionBefore(entry.version);
        resolved.push({
            name: entry.name,
            version: entry.version,
            ...(oldVersion !== undefined && { oldVersion }),
            directory: path.relative(workspace.rootDir, dir),
            changelog: changelog.contents
        });
    }

    return resolved;
}
