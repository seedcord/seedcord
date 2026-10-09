import { randomUUID } from 'node:crypto';
import { appendFile, cp, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');
const BUILD_OUTPUT = new Set(['dist', '.wrangler']);

// the fixture's imports resolve only from inside this package
async function edgeBotCopy(): Promise<string> {
    const projectDir = join(import.meta.dirname, '../../temp', `edge-boot-${randomUUID()}`);
    await cp(EDGE_BOT, projectDir, { recursive: true, filter: (source) => !BUILD_OUTPUT.has(basename(source)) });
    onTestFinished(() => rm(projectDir, { recursive: true, force: true }));
    return projectDir;
}

describe('seedcord build boots an edge bot in workerd', () => {
    it('throws CliEdgeBootFailed with workerd error for a timer set at global scope', async () => {
        const projectDir = await edgeBotCopy();
        await appendFile(join(projectDir, 'src/bot.ts'), '\nsetTimeout(() => undefined, 1);\n');

        await expect(BuildRunner.create(quietSteps).run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeBootFailed,
            message: expect.stringContaining('Disallowed operation called within global scope') as string
        });
    }, 120_000);
});
