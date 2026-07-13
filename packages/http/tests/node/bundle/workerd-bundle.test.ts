import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { build } from 'esbuild';
import { afterAll, describe, expect, it } from 'vitest';

const packageRoot = path.resolve(import.meta.dirname, '../../..');

let outDir: string;

afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
});

describe('workerd bundle', () => {
    // the vitest workerd pool cannot transform @discordjs/builders, so edge viability is proven by
    // bundling the real entry the way a worker build would
    it('bundles the package entry with the dispatch path reachable and no node builtins', async () => {
        outDir = await mkdtemp(path.join(tmpdir(), 'seedcord-http-bundle-'));

        const result = await build({
            entryPoints: [path.join(packageRoot, 'src/index.ts')],
            bundle: true,
            format: 'esm',
            platform: 'browser',
            conditions: ['workerd'],
            outfile: path.join(outDir, 'worker.mjs'),
            metafile: true,
            logLevel: 'error',
            absWorkingDir: packageRoot
        });

        const inputs = Object.keys(result.metafile.inputs);
        expect(inputs).toContain('src/dispatch/dispatchInteraction.ts');
        expect(inputs).toContain('src/reply/ReplySender.ts');
        expect(inputs.some((input) => input.includes('@discordjs/builders'))).toBe(true);
    }, 30_000);
});
