import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { APP_ID } from '#tests/helpers/fixtures';
import { bindSignedEnv, serverConfig, stopHost } from '#tests/helpers/nodeHost';

let live: Seedcord | undefined;

async function startHost(): Promise<Seedcord> {
    await bindSignedEnv();
    const host = new Seedcord(serverConfig());
    live = host;
    return host.start();
}

afterEach(async () => {
    await stopHost(live);
    live = undefined;
});

describe('core.applicationId on the http host', () => {
    it('resolves without a commands directory', async () => {
        const host = await startHost();

        expect(host.applicationId).toBe(APP_ID);
    });

    it('throws before the host reads its token', () => {
        const host = new Seedcord(serverConfig());
        live = host;

        expect(() => host.applicationId).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreApplicationUnavailable })
        );
    });
});
