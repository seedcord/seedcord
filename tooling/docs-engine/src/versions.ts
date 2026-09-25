import { gt, major, parse, prerelease, rcompare } from 'semver';

import type { PackageIndexEntry } from '#remote/index-json';

export function isPrerelease(version: string): boolean {
    return prerelease(version) !== null;
}

// rcompare throws on a version string that fails semver parsing.
function sortVersionsDesc(versions: readonly string[]): string[] {
    return [...versions].sort(rcompare);
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

/**
 * The head of `version`'s minor line, or of its major line when the index lists no such minor. A prerelease
 * falls back to the prerelease head of its own major when that line head isn't newer. Returns `null` when the
 * index still serves `version`, when `version` isn't full semver, or when nothing newer exists.
 */
export function replacementVersion(
    entry: Pick<PackageIndexEntry, 'stable' | 'prerelease'>,
    version: string
): string | null {
    const requested = parse(version);
    if (requested?.version !== version) return null;

    const { stable, prerelease: next } = entry;
    if (next?.latest === version || (stable && stableLineHeads(stable).includes(version))) return null;

    const minorHead = stable?.latestByMinor[`${requested.major}.${requested.minor}`];
    const lineHead = minorHead ?? stable?.latestByMajor[String(requested.major)];
    const nextOnSameMajor = next !== null && major(next.latest) === requested.major;
    const prereleaseHead = requested.prerelease.length > 0 && nextOnSameMajor ? next.latest : undefined;
    return [lineHead, prereleaseHead].find((candidate) => candidate !== undefined && gt(candidate, requested)) ?? null;
}
