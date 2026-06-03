import { major, minor, prerelease, rcompare, valid } from 'semver';

import type { IndexJson, PackageIndexEntry, StableChannel } from '@remote/index-json';
import type { EntityTone } from '@src/tones';

export interface PackageVersionsInput {
    folder: string;
    fullName: string;
    versions: readonly string[];
    entities?: Record<string, EntityTone>;
}

export interface BuildIndexOptions {
    updatedAt: string;
    pathTemplates?: { stable: string; prerelease: string };
}

const DEFAULT_PATH_TEMPLATES = {
    stable: 'packages/{name}/releases/{version}/project.json',
    prerelease: 'packages/{name}/prerelease/{version}/project.json'
} as const;

/**
 * Assemble an {@link IndexJson} from each package's full version list. Stable versions set `latest`
 * plus the per-minor / per-major line-head maps; the newest prerelease becomes `prerelease.latest`.
 * Invalid version strings are dropped.
 */
export function buildIndex(packages: readonly PackageVersionsInput[], options: BuildIndexOptions): IndexJson {
    const entries: Record<string, PackageIndexEntry> = {};
    for (const pkg of packages) {
        entries[pkg.folder] = buildEntry(pkg.fullName, pkg.versions, pkg.entities);
    }

    return {
        schemaVersion: 1,
        updatedAt: options.updatedAt,
        pathTemplates: options.pathTemplates ?? { ...DEFAULT_PATH_TEMPLATES },
        packages: entries
    };
}

function buildEntry(
    fullName: string,
    versions: readonly string[],
    entities?: Record<string, EntityTone>
): PackageIndexEntry {
    const valids = versions.filter((version) => valid(version) !== null);
    const stable = valids.filter((version) => prerelease(version) === null);
    const pre = valids.filter((version) => prerelease(version) !== null);

    const entry: PackageIndexEntry = {
        fullName,
        stable: buildStable(stable),
        prerelease: buildPrerelease(pre)
    };

    if (entities && Object.keys(entities).length > 0) {
        entry.entities = entities;
    }

    return entry;
}

function buildStable(versions: readonly string[]): StableChannel | null {
    const sorted = [...versions].sort(rcompare);
    const [latest] = sorted;
    if (!latest) {
        return null;
    }

    return {
        latest,
        latestByMinor: headsBy(sorted, (version) => `${major(version)}.${minor(version)}`),
        latestByMajor: headsBy(sorted, (version) => `${major(version)}`)
    };
}

function buildPrerelease(versions: readonly string[]): { latest: string } | null {
    const [latest] = [...versions].sort(rcompare);
    return latest ? { latest } : null;
}

// `sorted` is descending, so the first version seen for a key is its line head.
function headsBy(sorted: readonly string[], keyOf: (version: string) => string): Record<string, string> {
    const heads: Record<string, string> = {};
    for (const version of sorted) {
        const key = keyOf(version);
        heads[key] ??= version;
    }
    return heads;
}
