import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// every seedcord package writes each engines range as `>=` and a version
const MINIMUM = '>=';
const SPACES = /\s/g;

interface EngineRanges {
    node: string;
    bun: string;
}

interface RuntimeVersions {
    node: string;
    bun?: string | undefined;
}

function versionParts(text: string): number[] | undefined {
    const [release = ''] = text.replace(/^v/, '').split(/[-+]/);
    const parts = release.split('.').map(Number);
    return parts.every(Number.isInteger) ? parts : undefined;
}

function meetsMinimum(required: number[], running: number[]): boolean {
    for (const [index, wanted] of required.entries()) {
        const got = running[index] ?? 0;
        if (got !== wanted) return got > wanted;
    }
    return true;
}

/** @internal */
export function assertRuntimeVersion(ranges: EngineRanges, versions: RuntimeVersions): void {
    // bun also sets process.versions.node, to the node version it reports compatibility with
    const runtime =
        versions.bun === undefined
            ? { name: 'Node', range: ranges.node, running: versions.node }
            : { name: 'Bun', range: ranges.bun, running: versions.bun };

    const range = runtime.range.replaceAll(SPACES, '');
    if (!range.startsWith(MINIMUM)) return;

    const required = versionParts(range.slice(MINIMUM.length));
    const running = versionParts(runtime.running);
    if (!required || !running || meetsMinimum(required, running)) return;

    throw new SeedcordError(SeedcordErrorCode.UnsupportedRuntimeVersion, [
        runtime.name,
        runtime.range,
        runtime.running
    ]);
}

// tsdown-config bakes both ranges in from this package's engines
/** @internal */
export function assertDeclaredRuntime(): void {
    assertRuntimeVersion(
        { node: process.env.PACKAGE_NODE_RANGE ?? '', bun: process.env.PACKAGE_BUN_RANGE ?? '' },
        process.versions
    );
}
