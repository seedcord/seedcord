import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentSteps } from '#tests/silentSteps';

const BAD_FOLDERS_BOT = join(import.meta.dirname, '../../fixtures/bad-folders-bot');

describe('seedcord build on a bot with several bad folders', () => {
    it('reports every bad folder in one error', async () => {
        await expect(BuildRunner.create(silentSteps).run(BAD_FOLDERS_BOT)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliBuildFolderProblems,
            errors: [
                expect.objectContaining({ code: SeedcordErrorCode.CoreDirectoryOutsideRoot }),
                expect.objectContaining({ code: SeedcordErrorCode.CliBuildRelativeFolder })
            ]
        });
    }, 120_000);
});
