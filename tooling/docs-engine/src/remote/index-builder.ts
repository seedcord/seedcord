import { compareReversed, getMajor, getMinor, isPrerelease, isValid } from 'verkit';

import type { IndexJson, PackageIndexEntry, StableChannel } from '#remote/index-json';
import type { EntityTone } from '#src/tones';

export interface PackageVersionsInput {
    folder: string;
    fullName: string;
    versions: readonly string[];
    entities?: Record<string, EntityTone>;
    description?: string;
    workspace?: string;
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
 * and the per-minor and per-major line-head maps. The newest prerelease becomes `prerelease.latest`.
 * It skips invalid version strings.
 */
export function buildIndex(packages: readonly PackageVersionsInput[], options: BuildIndexOptions): IndexJson {
    const entries: Record<string, PackageIndexEntry> = {};
    for (const pkg of packages) {
        entries[pkg.folder] = buildEntry(pkg);
    }

    return {
        schemaVersion: 1,
        updatedAt: options.updatedAt,
        pathTemplates: options.pathTemplates ?? { ...DEFAULT_PATH_TEMPLATES },
        packages: entries
    };
}

function buildEntry(pkg: PackageVersionsInput): PackageIndexEntry {
    const valids = pkg.versions.filter((version) => isValid(version));
    const stable = valids.filter((version) => !isPrerelease(version));
    const pre = valids.filter((version) => isPrerelease(version));

    const entry: PackageIndexEntry = {
        fullName: pkg.fullName,
        stable: buildStable(stable),
        prerelease: buildPrerelease(pre)
    };

    if (pkg.entities && Object.keys(pkg.entities).length > 0) {
        entry.entities = pkg.entities;
    }

    if (pkg.description) {
        entry.description = pkg.description;
    }

    if (pkg.workspace) {
        entry.workspace = pkg.workspace;
    }

    return entry;
}

/** The highest stable version in a list, ignoring prereleases and anything unparseable. */
export function newestStable(versions: readonly string[]): string | undefined {
    const stable = versions.filter((version) => isValid(version) && !isPrerelease(version));
    return [...stable].sort(compareReversed)[0];
}

function buildStable(versions: readonly string[]): StableChannel | null {
    const sorted = [...versions].sort(compareReversed);
    const [latest] = sorted;
    if (!latest) {
        return null;
    }

    return {
        latest,
        latestByMinor: headsBy(sorted, (version) => `${getMajor(version)}.${getMinor(version)}`),
        latestByMajor: headsBy(sorted, (version) => `${getMajor(version)}`)
    };
}

function buildPrerelease(versions: readonly string[]): { latest: string } | null {
    const [latest] = [...versions].sort(compareReversed);
    return latest ? { latest } : null;
}

// the first version seen for a key is its line head because `sorted` is descending.
function headsBy(sorted: readonly string[], keyOf: (version: string) => string): Record<string, string> {
    const heads: Record<string, string> = {};
    for (const version of sorted) {
        const key = keyOf(version);
        heads[key] ??= version;
    }
    return heads;
}
