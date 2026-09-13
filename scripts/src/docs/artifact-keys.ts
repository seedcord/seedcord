import { isPrerelease } from '@seedcord/docs-engine';

interface VersionedPackage {
    folder: string;
    versions: readonly string[];
}

export function versionDir(folder: string, version: string): string {
    return `packages/${folder}/${isPrerelease(version) ? 'prerelease' : 'releases'}/${version}`;
}

export function artifactKeys(packages: readonly VersionedPackage[]): Set<string> {
    const keys = new Set<string>(['index.json']);

    for (const { folder, versions } of packages) {
        for (const version of versions) {
            keys.add(`${versionDir(folder, version)}/project.json`);
            keys.add(`${versionDir(folder, version)}/api.json`);
        }
    }

    return keys;
}

export function isArtifactKey(key: string): boolean {
    return key === 'index.json' || key.endsWith('/project.json') || key.endsWith('/api.json');
}
