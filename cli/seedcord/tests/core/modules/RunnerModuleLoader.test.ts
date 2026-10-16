import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { RunnerModuleLoader } from '#core/modules/RunnerModuleLoader';

import type { ModuleRunner } from 'vite/module-runner';

// justified: the loader calls only import() on the runner
const stallingRunner = { import: () => new Promise(() => undefined) } as unknown as ModuleRunner;

describe('RunnerModuleLoader', () => {
    it('throws CoreImportFailed for a module still loading at the deadline', async () => {
        const modules = new RunnerModuleLoader(stallingRunner, 50);

        await expect(modules.importModule(import.meta.filename)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreImportFailed,
            message: expect.stringContaining('0.05s') as string
        });
    }, 2000);
});
