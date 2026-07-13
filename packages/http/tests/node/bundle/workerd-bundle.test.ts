import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);

const packageRoot = path.resolve(import.meta.dirname, '../../..');
const esbuildBin = path.resolve(packageRoot, '../../node_modules/.bin/esbuild');

let outDir: string;

afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
});

describe('workerd bundle', () => {
    // the vitest workerd pool cannot transform @discordjs/builders, so edge viability is proven by
    // bundling the real entry the way a worker build would
    it('bundles the package entry with the dispatch path reachable and no node builtins', async () => {
        outDir = await mkdtemp(path.join(tmpdir(), 'seedcord-http-bundle-'));
        const metafile = path.join(outDir, 'meta.json');

        await run(esbuildBin, [
            path.join(packageRoot, 'src/index.ts'),
            '--bundle',
            '--format=esm',
            '--platform=browser',
            '--conditions=workerd',
            `--outfile=${path.join(outDir, 'worker.mjs')}`,
            `--metafile=${metafile}`,
            '--log-level=error'
        ]);

        const meta = JSON.parse(await readFile(metafile, 'utf8')) as { inputs: Record<string, unknown> };
        const inputs = Object.keys(meta.inputs);
        expect(inputs).toContain('src/dispatch/dispatchInteraction.ts');
        expect(inputs).toContain('src/reply/ReplySender.ts');
        expect(inputs.some((input) => input.includes('@discordjs/builders'))).toBe(true);
    }, 30_000);
});
