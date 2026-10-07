import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentSteps } from '#tests/silentSteps';

const RELATIVE_PATH_BOT = join(import.meta.dirname, '../../fixtures/relative-path-bot');

describe('seedcord build on a bot with a relative handler folder', () => {
    it('throws before writing anything', async () => {
        await rm(join(RELATIVE_PATH_BOT, 'dist'), { recursive: true, force: true });

        await expect(BuildRunner.create(silentSteps).run(RELATIVE_PATH_BOT)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliBuildRelativeFolder
        });
        expect(existsSync(join(RELATIVE_PATH_BOT, 'dist'))).toBe(false);
    }, 120_000);
});
