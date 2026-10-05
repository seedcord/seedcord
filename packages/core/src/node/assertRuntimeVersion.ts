import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// every seedcord package writes each engines range as `>=` and a version
const MINIMUM = '>=';
const SPACES = /\s/g;

interface Version {
    parts: number[];
    prerelease: boolean;
}

function parseVersion(text: string): Version | undefined {
    const [withoutBuild = ''] = text.replace(/^v/, '').split('+');
    const [release = '', ...prerelease] = withoutBuild.split('-');
    const parts = release.split('.').map(Number);
    return parts.every(Number.isInteger) ? { parts, prerelease: prerelease.length > 0 } : undefined;
}

// semver ranks 1.4.2-canary.1 below 1.4.2
function meetsMinimum(required: Version, running: Version): boolean {
    const length = Math.max(required.parts.length, running.parts.length);
    for (let index = 0; index < length; index++) {
        const wanted = required.parts[index] ?? 0;
        const got = running.parts[index] ?? 0;
        if (got !== wanted) return got > wanted;
    }
    return !running.prerelease;
}

export function assertDeclaredRuntime(): void {
    const { bun, node } = process.versions;
    // tsdown-config bakes both ranges in from this package's engines
    const runtime =
        bun === undefined
            ? { name: 'Node', range: process.env.PACKAGE_NODE_RANGE ?? '', running: node }
            : { name: 'Bun', range: process.env.PACKAGE_BUN_RANGE ?? '', running: bun };

    const range = runtime.range.replaceAll(SPACES, '');
    if (!range.startsWith(MINIMUM)) return;

    const required = parseVersion(range.slice(MINIMUM.length));
    const running = parseVersion(runtime.running);
    if (!required || !running || meetsMinimum(required, running)) return;

    throw new SeedcordError(SeedcordErrorCode.UnsupportedRuntimeVersion, [
        runtime.name,
        runtime.range,
        runtime.running
    ]);
}
