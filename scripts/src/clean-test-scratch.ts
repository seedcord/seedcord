/* eslint-disable no-console -- CLI script so console is ok */
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import type { Dirent } from 'node:fs';

// A killed test run leaves fixtures behind, where the next `tc` reads them as source.
// Excluding this directory in tsconfig instead breaks the gateway tests.
const SCRATCH_DIR = path.join('tests', 'temp');

const SKIP = new Set(['node_modules', 'dist', 'coverage', 'generated']);

function isSearchable(entry: Dirent): boolean {
    return entry.isDirectory() && !entry.name.startsWith('.') && !SKIP.has(entry.name);
}

async function childDirs(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    return entries.filter(isSearchable).map((entry) => path.join(dir, entry.name));
}

async function main(): Promise<void> {
    const roots = await childDirs('.');
    const nested = await Promise.all(roots.map(childDirs));
    const packages = nested.flat();
    const cleared: string[] = [];

    for (const pkg of packages) {
        const scratch = path.join(pkg, SCRATCH_DIR);
        if (!(await readdir(scratch).catch(() => null))) continue;
        await rm(scratch, { recursive: true, force: true });
        cleared.push(scratch);
    }

    console.log(cleared.length > 0 ? `Cleared ${cleared.join(', ')}` : 'No test scratch to clear');
}

main().catch((error: unknown) => {
    console.error('\n❌ clean-test-scratch.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
