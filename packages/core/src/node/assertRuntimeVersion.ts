import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// every seedcord package writes each engines range as `>=` and a version
const MINIMUM = '>=';
const SPACES = /\s/g;

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

export function assertDeclaredRuntime(): void {
    const { bun, node } = process.versions;
    // tsdown-config bakes both ranges in from this package's engines
    const runtime =
        bun === undefined
            ? { name: 'Node', range: process.env.PACKAGE_NODE_RANGE ?? '', running: node }
            : { name: 'Bun', range: process.env.PACKAGE_BUN_RANGE ?? '', running: bun };

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
