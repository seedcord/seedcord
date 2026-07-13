import { Envapter, PortableSource } from 'envapt';
import { vi } from 'vitest';

import { createSeedcord } from '@src/createSeedcord';

import { createSigner, type Signer } from '../../helpers/ed25519';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { Config } from '@seedcord/types';
import type { RouteManifest } from '@src/manifest/RouteManifest';

const encoder = new TextEncoder();

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
    manifest: RouteManifest,
    config: Config = nullPathConfig
): Promise<{ signer: Signer; handle: ReturnType<typeof createSeedcord> }> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN }));
    return { signer, handle: createSeedcord(config, manifest) };
}

export function slashPayload(name: string): object {
    return { type: 2, id: 'int-1', application_id: 'app-1', token: 'tok', data: { type: 1, name } };
}

export interface CapturedCtx {
    waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>>;
    settled: () => Promise<unknown>;
}

export function capturingCtx(): CapturedCtx {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    return {
        waitUntil,
        settled: async () => {
            const call = waitUntil.mock.calls[0];
            if (!call) throw new Error('waitUntil was never called');
            return call[0];
        }
    };
}

export { emptyManifest } from '../../helpers/fixtures';
