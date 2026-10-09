import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import type { BuildResult } from '#commands/build/BuildRunner';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');
const WRANGLER = join(import.meta.dirname, '../../../node_modules/wrangler/bin/wrangler.js');

describe('seedcord build on an edge bot', () => {
    let result: BuildResult;

    beforeAll(async () => {
        result = await BuildRunner.create(quietSteps).run(EDGE_BOT);
    }, 120_000);

    it('reports the worker it bundled for the summary', () => {
        expect(result.bundle).toEqual({
            modules: 2,
            textFiles: 1,
            bytes: expect.any(Number) as number,
            entry: join(EDGE_BOT, 'dist/index.mjs')
        });
    });

    it('writes a worker that wrangler deploys from the project folder', () => {
        const { status, stdout, stderr } = spawnSync(process.execPath, [WRANGLER, 'deploy', '--dry-run'], {
            cwd: EDGE_BOT,
            encoding: 'utf8'
        });

        expect(stdout + stderr).toContain('Using redirected Wrangler configuration');
        expect(status).toBe(0);
    }, 60_000);
});
