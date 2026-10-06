import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

// a process holds one Seedcord. vitest gives each test file its own process.
const TYPE_ERROR_BOT = join(import.meta.dirname, '../../fixtures/type-error-bot');

describe('seedcord build on a bot with a type error', () => {
    it('throws with the diagnostic before writing anything', async () => {
        await rm(join(TYPE_ERROR_BOT, 'dist'), { recursive: true, force: true });

        const build = BuildRunner.create(silentLogger).run(TYPE_ERROR_BOT);

        await expect(build).rejects.toMatchObject({ code: SeedcordErrorCode.CliBuildFailed });
        await expect(build).rejects.toThrow(/Broken\.ts/);
        expect(existsSync(join(TYPE_ERROR_BOT, 'dist'))).toBe(false);
    }, 120_000);
});
