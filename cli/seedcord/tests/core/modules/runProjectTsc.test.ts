import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { runProjectTsc } from '#core/modules/runProjectTsc';

describe('runProjectTsc', () => {
    // node cannot start a child in a cwd that does not exist
    it('throws CliTypescriptNotStarted when the compiler process cannot start', async () => {
        const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-tsc-'));
        onTestFinished(() => tmp.remove());

        await expect(runProjectTsc(join(tmp.path, 'missing'), ['--version'])).rejects.toMatchObject({
            code: SeedcordErrorCode.CliTypescriptNotStarted
        });
    });
});
