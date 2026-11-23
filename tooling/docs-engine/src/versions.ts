import {
    compareReversed,
    getMajor,
    isGreaterThan,
    isPrerelease as versionIsPrerelease,
    normalize,
    tryParse
} from 'verkit';

import type { PackageIndexEntry } from '#remote/index-json';

export function isPrerelease(version: string): boolean {
    return versionIsPrerelease(version) === true;
}

function sortVersionsDesc(versions: readonly string[]): string[] {
    return [...versions].sort(compareReversed);
}

/**
 * The distinct stable line heads to surface in the version picker, descending. This is the union of
 * the per-minor and per-major latest maps. `latestByMajor['0']` repeats the newest 0.x minor.
 */
export function stableLineHeads(channel: {
    latestByMinor: Record<string, string>;
    latestByMajor: Record<string, string>;
}): string[] {
    return sortVersionsDesc([
        ...new Set([...Object.values(channel.latestByMinor), ...Object.values(channel.latestByMajor)])
    ]);
}

// a 0.x minor can break like a major. 2 covers someone upgrading from the previous one
const ZERO_MINORS_SHOWN = 2;

export function servedStableVersions(channel: Parameters<typeof stableLineHeads>[0]): string[] {
    const majorHeads = Object.values(channel.latestByMajor).filter((version) => getMajor(version) > 0);
    const zeroMinors = stableLineHeads(channel)
        .filter((version) => getMajor(version) === 0)
        .slice(0, ZERO_MINORS_SHOWN);
    return sortVersionsDesc([...majorHeads, ...zeroMinors]);
}

export function servedPrerelease({
    stable,
    prerelease
}: Pick<PackageIndexEntry, 'stable' | 'prerelease'>): string | null {
    if (!prerelease) return null;
    return stable && !isGreaterThan(prerelease.latest, stable.latest) ? null : prerelease.latest;
}

/**
 * The version that replaces an old `version`. That's the newest patch of the same minor if the docs still
 * show that minor, then the newest release of the same major, then the newest stable release. An old prerelease
 * maps to the current prerelease of its major when that one is newer. Returns `null` when the docs still show
 * `version`, when `version` isn't a full semver string, or when nothing newer exists.
 */
export function replacementVersion(
    entry: Pick<PackageIndexEntry, 'stable' | 'prerelease'>,
    version: string
): string | null {
    const requested = tryParse(version);
    if (!requested || normalize(requested) !== version) return null;

    const { stable } = entry;
    const next = servedPrerelease(entry);
    const served = stable ? servedStableVersions(stable) : [];
    if (next === version || served.includes(version)) return null;

    const lineHead = [
        stable?.latestByMinor[`${requested.major}.${requested.minor}`],
        stable?.latestByMajor[String(requested.major)],
        stable?.latest
    ].find((candidate) => candidate !== undefined && served.includes(candidate));
    const prereleaseHead =
        versionIsPrerelease(requested) && next !== null && getMajor(next) === requested.major ? next : undefined;
    return (
        [lineHead, prereleaseHead].find(
            (candidate) => candidate !== undefined && isGreaterThan(candidate, requested)
        ) ?? null
    );
}
