import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { environmentNamed } from '#core/modules/userCodeConfig';

describe('environmentNamed', () => {
    it('throws CliViteEnvironmentMissing that lists the environments Vite created', () => {
        expect(() => environmentNamed({ client: 1, ssr: 2 }, 'seedcord', 'Reinstall the plugin.')).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.CliViteEnvironmentMissing,
                message: expect.stringMatching(/only .*client.* and .*ssr.*\. Reinstall the plugin\./su) as string
            })
        );
    });
});
