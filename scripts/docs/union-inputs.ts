import type { IndexJson, PackageVersionsInput } from '@seedcord/docs-engine';

export interface EmittedEntry {
    folder: string;
    fullName: string;
    version: string;
    channel: 'stable' | 'prerelease';
    entities: PackageVersionsInput['entities'];
    description: string | undefined;
}

// The index stores only line heads (stable.latest, latestByMinor/Major, prerelease.latest). For the pre-1.0
// "latest patch per minor" axis those heads are the kept set, so remote heads plus emitted versions is the
// complete union.
export function buildUnionInputs(remote: IndexJson | null, emitted: readonly EmittedEntry[]): PackageVersionsInput[] {
    const byFolder = new Map<
        string,
        {
            fullName: string;
            versions: Set<string>;
            entities: PackageVersionsInput['entities'];
            description: string | undefined;
        }
    >();

    if (remote) {
        for (const [folder, entry] of Object.entries(remote.packages)) {
            const versions = new Set<string>();
            if (entry.stable) {
                versions.add(entry.stable.latest);
                for (const v of Object.values(entry.stable.latestByMinor)) versions.add(v);
                for (const v of Object.values(entry.stable.latestByMajor)) versions.add(v);
            }
            if (entry.prerelease) versions.add(entry.prerelease.latest);
            byFolder.set(folder, {
                fullName: entry.fullName,
                versions,
                entities: entry.entities,
                description: entry.description
            });
        }
    }

    for (const e of emitted) {
        const current = byFolder.get(e.folder) ?? {
            fullName: e.fullName,
            versions: new Set<string>(),
            entities: undefined,
            description: undefined
        };
        current.versions.add(e.version);
        current.entities = e.entities;
        current.description = e.description;
        byFolder.set(e.folder, current);
    }

    const inputs: PackageVersionsInput[] = [];
    for (const [folder, value] of byFolder) {
        inputs.push({
            folder,
            fullName: value.fullName,
            versions: [...value.versions],
            ...(value.entities && { entities: value.entities }),
            ...(value.description && { description: value.description })
        });
    }
    return inputs;
}
