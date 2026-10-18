import { basename } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { copyEdgeBotForTest, edgeBuildRunner, writeCloudflareConfig } from './edgeBot';

import type { WorkerConfig } from 'cf/config';

async function edgeBotWith(worker: Partial<WorkerConfig>): Promise<string> {
    const projectDir = await copyEdgeBotForTest();
    await writeCloudflareConfig(projectDir, worker);
    return projectDir;
}

function build(projectDir: string): Promise<unknown> {
    return edgeBuildRunner().run(projectDir);
}

describe('seedcord build checks that an edge bot keeps Node compat on', () => {
    it('throws CliEdgeCompatDateTooOld for a date before 2026-08-04 without nodejs_compat', async () => {
        const projectDir = await edgeBotWith({ compatibilityDate: '2026-08-03' });

        await expect(build(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeCompatDateTooOld,
            message: expect.stringContaining(`${basename(projectDir)}/cloudflare.config.ts`) as string
        });
    }, 120_000);

    it('builds an older date that turns on nodejs_compat', async () => {
        const projectDir = await edgeBotWith({
            compatibilityDate: '2026-08-03',
            compatibilityFlags: ['nodejs_compat']
        });

        await expect(build(projectDir)).resolves.toBeDefined();
    }, 120_000);

    // workerd loads no node: modules for nodejs_compat_v2 alone
    it('throws CliEdgeCompatDateTooOld for an older date with only nodejs_compat_v2', async () => {
        const projectDir = await edgeBotWith({
            compatibilityDate: '2026-08-03',
            compatibilityFlags: ['nodejs_compat_v2']
        });

        await expect(build(projectDir)).rejects.toMatchObject({ code: SeedcordErrorCode.CliEdgeCompatDateTooOld });
    }, 120_000);

    it('throws CliEdgeNodeCompatOff for no_nodejs_compat', async () => {
        const projectDir = await edgeBotWith({
            compatibilityDate: '2026-08-04',
            compatibilityFlags: ['no_nodejs_compat']
        });

        await expect(build(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeNodeCompatOff,
            message: expect.stringContaining(`${basename(projectDir)}/cloudflare.config.ts`) as string
        });
    }, 120_000);
});
