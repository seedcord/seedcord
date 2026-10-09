import { writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import { copyEdgeBotForTest } from './edgeBot';

async function edgeBotWith(wrangler: Record<string, unknown>): Promise<string> {
    const projectDir = await copyEdgeBotForTest();
    await writeFile(join(projectDir, 'wrangler.jsonc'), JSON.stringify({ name: 'edge-bot', ...wrangler }));
    return projectDir;
}

function build(projectDir: string): Promise<unknown> {
    return BuildRunner.create(quietSteps).run(projectDir);
}

describe('seedcord build checks that an edge bot keeps Node compat on', () => {
    it('throws CliEdgeCompatDateTooOld for a date before 2026-08-04 without nodejs_compat', async () => {
        const projectDir = await edgeBotWith({ compatibility_date: '2026-08-03' });

        await expect(build(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeCompatDateTooOld,
            message: expect.stringContaining(join(basename(projectDir), 'wrangler.jsonc')) as string
        });
    }, 120_000);

    it('builds an older date that turns on nodejs_compat', async () => {
        const projectDir = await edgeBotWith({
            compatibility_date: '2026-08-03',
            compatibility_flags: ['nodejs_compat']
        });

        await expect(build(projectDir)).resolves.toBeDefined();
    }, 120_000);

    // workerd loads no node: modules for nodejs_compat_v2 alone
    it('throws CliEdgeCompatDateTooOld for an older date with only nodejs_compat_v2', async () => {
        const projectDir = await edgeBotWith({
            compatibility_date: '2026-08-03',
            compatibility_flags: ['nodejs_compat_v2']
        });

        await expect(build(projectDir)).rejects.toMatchObject({ code: SeedcordErrorCode.CliEdgeCompatDateTooOld });
    }, 120_000);

    it('throws CliEdgeNodeCompatOff for no_nodejs_compat', async () => {
        const projectDir = await edgeBotWith({
            compatibility_date: '2026-08-04',
            compatibility_flags: ['no_nodejs_compat']
        });

        await expect(build(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeNodeCompatOff,
            message: expect.stringContaining(join(basename(projectDir), 'wrangler.jsonc')) as string
        });
    }, 120_000);
});
