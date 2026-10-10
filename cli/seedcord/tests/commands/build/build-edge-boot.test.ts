import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import { copyEdgeBotForTest } from './edgeBot';

describe('seedcord build boots an edge bot in workerd', () => {
    it('throws CliEdgeBootFailed with workerd error for a timer set at global scope', async () => {
        const projectDir = await copyEdgeBotForTest();
        await appendFile(join(projectDir, 'src/bot.ts'), '\nsetTimeout(() => undefined, 1);\n');

        await expect(BuildRunner.create(quietSteps).run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeBootFailed,
            message: expect.stringContaining('Disallowed operation called within global scope') as string
        });
    }, 120_000);
});
