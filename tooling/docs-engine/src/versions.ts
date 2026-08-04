import { prerelease, rcompare } from 'semver';

export function isPrerelease(version: string): boolean {
    return prerelease(version) !== null;
}

// rcompare throws on a version string that fails semver parsing.
function sortVersionsDesc(versions: readonly string[]): string[] {
    return [...versions].sort(rcompare);
}

/**
 * The distinct stable line heads to surface in the version picker, descending. The union of the
 * per-minor and per-major latest maps; `latestByMajor['0']` repeats the newest 0.x minor, so the
 * Set drops the duplicate.
 */
export function stableLineHeads(channel: {
    latestByMinor: Record<string, string>;
    latestByMajor: Record<string, string>;
}): string[] {
    return sortVersionsDesc([
        ...new Set([...Object.values(channel.latestByMinor), ...Object.values(channel.latestByMajor)])
    ]);
}
