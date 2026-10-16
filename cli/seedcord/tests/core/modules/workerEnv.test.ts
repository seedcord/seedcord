import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { WorkerEnv } from '#core/modules/workerEnv';

describe('WorkerEnv', () => {
    it('throws CliWorkerEnvNotRead when something reads it before cloudflare.config.ts', () => {
        const workerEnv = new WorkerEnv(import.meta.dirname, 'development');

        expect(() => workerEnv.values()).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliWorkerEnvNotRead })
        );
    });
});
