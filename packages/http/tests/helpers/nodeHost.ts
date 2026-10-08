import { Envapter, merge, PortableSource } from 'envapt';

import { createSigner, signedHeaders, type Signer } from './ed25519';
import { VALID_TOKEN } from './fixtures';

import type { HttpServerConfig } from '#interfaces/Config';
import type { Seedcord } from '#src/node/Seedcord';

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

export async function postSigned(host: Seedcord, signer: Signer, payload: string): Promise<Response> {
    const body = new TextEncoder().encode(payload);
    return fetch(`http://127.0.0.1:${String(host.port)}`, {
        method: 'POST',
        headers: await signedHeaders(signer, body),
        body
    });
}
