import { randomUUID } from 'node:crypto';
import { cp, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');
const BUILD_OUTPUT = new Set(['dist', '.wrangler']);

// the fixture's imports resolve only from inside this package
async function edgeBotWith(wrangler: Record<string, unknown>): Promise<string> {
    const projectDir = join(import.meta.dirname, '../../temp', `edge-compat-${randomUUID()}`);
    await cp(EDGE_BOT, projectDir, { recursive: true, filter: (source) => !BUILD_OUTPUT.has(basename(source)) });
    await writeFile(join(projectDir, 'wrangler.jsonc'), JSON.stringify({ name: 'edge-bot', ...wrangler }));
    onTestFinished(() => rm(projectDir, { recursive: true, force: true }));
    return projectDir;
}

function build(projectDir: string): Promise<unknown> {
    return BuildRunner.create(quietSteps)
        .run(projectDir)
        .then(
            () => null,
            (caught: unknown) => caught
        );
}

describe('seedcord build checks that an edge bot keeps Node compat on', () => {
    it('throws CliEdgeCompatDateTooOld for a date before 2026-08-04 without nodejs_compat', async () => {
        const projectDir = await edgeBotWith({ compatibility_date: '2026-08-03' });

        await expect(build(projectDir)).resolves.toMatchObject({
            code: SeedcordErrorCode.CliEdgeCompatDateTooOld,
            message: expect.stringContaining(join(basename(projectDir), 'wrangler.jsonc')) as string
        });
    }, 120_000);

    it('builds a wrangler config with no compatibility_date', async () => {
        const projectDir = await edgeBotWith({});

        await expect(build(projectDir)).resolves.toBeNull();
    }, 120_000);

    it('builds an older date that turns on nodejs_compat', async () => {
        const projectDir = await edgeBotWith({
            compatibility_date: '2026-08-03',
            compatibility_flags: ['nodejs_compat']
        });

        await expect(build(projectDir)).resolves.toBeNull();
    }, 120_000);

    it('throws CliEdgeNodeCompatOff for no_nodejs_compat', async () => {
        const projectDir = await edgeBotWith({
            compatibility_date: '2026-08-04',
            compatibility_flags: ['no_nodejs_compat']
        });

        await expect(build(projectDir)).resolves.toMatchObject({
            code: SeedcordErrorCode.CliEdgeNodeCompatOff,
            message: expect.stringContaining(join(basename(projectDir), 'wrangler.jsonc')) as string
        });
    }, 120_000);
});
