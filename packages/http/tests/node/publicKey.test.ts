import { SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it, vi } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { createSigner } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';
import { bindSignedEnv, postSigned, serverConfig } from '#tests/helpers/nodeHost';

function bindTokenOnly(): void {
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));
}

describe('public key at startup', () => {
    it('reads the public key from discord when DISCORD_PUBLIC_KEY is unset', async () => {
        const signer = await createSigner();
        bindTokenOnly();
        await using host = new Seedcord(serverConfig());
        const get = vi.spyOn(host.rest, 'get').mockImplementation((route) => {
            if (route === Routes.currentApplication()) return Promise.resolve({ verify_key: signer.publicKeyHex });
            return Promise.reject(new Error(`unreachable route ${route}`));
        });

        await host.start();
        const response = await postSigned(host, signer, JSON.stringify({ type: 1 }));

        expect(response.status).toBe(200);
        expect(get).toHaveBeenCalledWith(Routes.currentApplication());
    });

    it("throws CoreDiscordReadFailed with discord's reason when that read fails", async () => {
        bindTokenOnly();
        await using host = new Seedcord(serverConfig());
        vi.spyOn(host.rest, 'get').mockRejectedValue(new Error('401: Unauthorized'));

        const failure = await host.start().catch((error: unknown) => error);

        expect(failure).toHaveProperty('code', SeedcordErrorCode.LifecyclePhaseFailures);
        expect(failure).toHaveProperty(['errors', 0, 'code'], SeedcordErrorCode.CoreDiscordReadFailed);
        expect(failure).toHaveProperty(['errors', 0, 'message'], expect.stringContaining('401: Unauthorized'));
    });

    it('verifies with DISCORD_PUBLIC_KEY without asking discord', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(serverConfig());
        const get = vi.spyOn(host.rest, 'get');

        await host.start();
        const response = await postSigned(host, signer, JSON.stringify({ type: 1 }));

        expect(response.status).toBe(200);
        expect(get).not.toHaveBeenCalledWith(Routes.currentApplication());
    });

    it('rejects a malformed DISCORD_PUBLIC_KEY with ConfigInvalidEnv', async () => {
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN, DISCORD_PUBLIC_KEY: 'zz'.repeat(32) }));
        await using host = new Seedcord(serverConfig());

        const failure = await host.start().catch((error: unknown) => error);

        expect(failure).toHaveProperty(['errors', 0, 'code'], SeedcordErrorCode.ConfigInvalidEnv);
    });
});
