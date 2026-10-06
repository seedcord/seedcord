import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

// a process holds one Seedcord. vitest gives each test file its own process.
const BAD_FOLDERS_BOT = join(import.meta.dirname, '../../fixtures/bad-folders-bot');

describe('seedcord build on a bot with several bad folders', () => {
    it('reports every bad folder in one error', async () => {
        await expect(BuildRunner.create(silentLogger).run(BAD_FOLDERS_BOT)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliBuildFolderProblems,
            errors: [
                expect.objectContaining({ code: SeedcordErrorCode.CoreDirectoryOutsideRoot }),
                expect.objectContaining({ code: SeedcordErrorCode.CliBuildRelativeFolder })
            ]
        });
    }, 120_000);
});
