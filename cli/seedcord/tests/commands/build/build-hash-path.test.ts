import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';
import { ShellMode } from '#core/viteMode';

const HASH_BOT = join(import.meta.dirname, '../../fixtures/hash#bot');

describe('seedcord build on a bot whose path contains a #', () => {
    it('throws CliPathHasHash before it loads the config', async () => {
        await expect(BuildRunner.create(quietSteps, new ShellMode()).run(HASH_BOT)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliPathHasHash
        });
    });
});
