import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { APP_ID } from '#tests/helpers/fixtures';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

describe('core.applicationId on the http host', () => {
    it('resolves without a commands directory', async () => {
        await bindSignedEnv();
        await using host = new Seedcord(serverConfig());
        await host.start();

        expect(host.applicationId).toBe(APP_ID);
    });

    it('throws before the host reads its token', async () => {
        await using host = new Seedcord(serverConfig());

        expect(() => host.applicationId).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreApplicationUnavailable })
        );
    });
});
