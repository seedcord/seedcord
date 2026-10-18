import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { copyEdgeBotForTest, edgeBuildRunner } from './edgeBot';

describe('seedcord build boots an edge bot in workerd', () => {
    it('throws CliEdgeBootFailed with workerd error for a timer set at global scope', async () => {
        const projectDir = await copyEdgeBotForTest();
        await appendFile(join(projectDir, 'src/bot.ts'), '\nsetTimeout(() => undefined, 1);\n');

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeBootFailed,
            message: expect.stringContaining('Disallowed operation called within global scope') as string
        });
    }, 120_000);

    it('boots the next build after a worker that failed to start', async () => {
        const broken = await copyEdgeBotForTest();
        await appendFile(join(broken, 'src/bot.ts'), '\nsetTimeout(() => undefined, 1);\n');
        await expect(edgeBuildRunner().run(broken)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeBootFailed
        });

        await expect(edgeBuildRunner().run(await copyEdgeBotForTest())).resolves.toBeDefined();
    }, 180_000);
});
