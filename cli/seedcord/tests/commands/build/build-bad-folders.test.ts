import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';
import { ShellMode } from '#src/core/ShellMode';

const BAD_FOLDERS_BOT = join(import.meta.dirname, '../../fixtures/bad-folders-bot');

describe('seedcord build on a bot with several bad folders', () => {
    it('reports every bad folder in one error', async () => {
        await expect(BuildRunner.create(quietSteps, new ShellMode()).run(BAD_FOLDERS_BOT)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliProblems,
            errors: [
                expect.objectContaining({ code: SeedcordErrorCode.CorePathOutsideRoot }),
                expect.objectContaining({ code: SeedcordErrorCode.CorePathOutsideRoot }),
                expect.objectContaining({ code: SeedcordErrorCode.CoreDirectorySkipped })
            ]
        });
    }, 120_000);
});
