import { storeInteractionRoute } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';

import { createSeedcord } from '#src/createSeedcord';
import { createSigner, type Signer } from '#tests/helpers/ed25519';
import { manifestWith, nullPathConfig, VALID_TOKEN } from '#tests/helpers/fixtures';

import type { HandlerConstructor } from '#handlers/constructors';
import type { HttpConfig } from '#interfaces/Config';
import type { Manifest } from '#src/manifest/Manifest';
import type { InteractionKind } from '@seedcord/core';

const encoder = new TextEncoder();

export const FROM = 'handlers/Test.ts';

export async function signedRequest(signer: Signer, payload: unknown): Promise<Request> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = encoder.encode(JSON.stringify(payload));
    return new Request('https://bot.example/interactions', {
        method: 'POST',
        headers: {
            'x-signature-ed25519': await signer.sign(timestamp, body),
            'x-signature-timestamp': timestamp
        },
        body
    });
}

export async function readyEngine(
    manifest: Manifest,
    config: HttpConfig = nullPathConfig
): Promise<{ signer: Signer; handle: ReturnType<typeof createSeedcord> }> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN }));
    return { signer, handle: createSeedcord(config, manifest) };
}

export { capturingCtx, slashPayload } from '#tests/helpers/interactions';
export type { CapturedCtx } from '#tests/helpers/interactions';

// stamps the metadata a route decorator writes on a real handler
export function manifestFor(kind: InteractionKind, key: string, handler: HandlerConstructor): Manifest {
    storeInteractionRoute(kind, key, handler);
    return manifestWith({ handlers: [handler] });
}

export { emptyManifest } from '#tests/helpers/fixtures';
