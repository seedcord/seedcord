import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';

import { createSigner } from '../helpers/ed25519';
import { APP_ID, VALID_TOKEN } from '../helpers/fixtures';

import type { HttpConfig } from '#src/interfaces/Config';

let live: Seedcord | undefined;

function noCommandsConfig(): HttpConfig {
    return {
        bot: { interactions: { path: null }, commands: { path: null } },
        subscribers: { path: null },
        port: 0
    };
}

async function startHost(): Promise<Seedcord> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );

    const host = new Seedcord(noCommandsConfig());
    live = host;
    return host.start();
}

afterEach(async () => {
    await live?.shutdown.run(0, false);
    live = undefined;
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
});

describe('core.applicationId on the http host', () => {
    it('resolves without a commands directory', async () => {
        const host = await startHost();

        expect(host.applicationId).toBe(APP_ID);
    });

    it('throws before the host reads its token', () => {
        const host = new Seedcord(noCommandsConfig());
        live = host;

        expect(() => host.applicationId).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreApplicationUnavailable })
        );
    });
});
