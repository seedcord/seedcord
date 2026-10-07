import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentSteps } from '#tests/silentSteps';

const OUTSIDE_ROOT_BOT = join(import.meta.dirname, '../../fixtures/outside-root-bot');

describe('seedcord build on a bot with a folder outside root', () => {
    it('throws before writing anything', async () => {
        await rm(join(OUTSIDE_ROOT_BOT, 'dist'), { recursive: true, force: true });

        await expect(BuildRunner.create(silentSteps).run(OUTSIDE_ROOT_BOT)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryOutsideRoot
        });
        expect(existsSync(join(OUTSIDE_ROOT_BOT, 'dist'))).toBe(false);
    }, 120_000);
});
