import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { botEnvironment } from '#core/modules/userCodeConfig';

describe('botEnvironment', () => {
    it('throws CliViteEnvironmentMissing that lists the environments Vite created', () => {
        expect(() => botEnvironment({ client: 1, ssr: 2 }, 'Reinstall the plugin.')).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.CliViteEnvironmentMissing,
                message: expect.stringMatching(/only .*client.* and .*ssr.*\. Reinstall the plugin\./su) as string
            })
        );
    });
});
