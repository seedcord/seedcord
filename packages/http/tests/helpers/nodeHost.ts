import { shutdownOf } from '@seedcord/core/node/internal';
import { Envapter, merge, PortableSource } from 'envapt';

import { Seedcord } from '#src/node/Seedcord';

import { createSigner, type Signer } from './ed25519';
import { VALID_TOKEN } from './fixtures';

import type { HttpServerConfig } from '#interfaces/Config';

export async function bindSignedEnv(): Promise<Signer> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
    return signer;
}

// node binds port 0 to any free port
export function serverConfig(bot: Partial<HttpServerConfig['bot']> = {}): HttpServerConfig {
    return {
        bot: { interactions: { path: null }, commands: { path: null }, ...bot },
        subscribers: { path: null },
        port: 0
    };
}

export function resetSeedcord(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

export async function stopHost(host: Seedcord | undefined): Promise<void> {
    if (host) await shutdownOf(host).run(0, false);
    resetSeedcord();
}
