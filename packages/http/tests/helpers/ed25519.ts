const encoder = new TextEncoder();
const HEX_RADIX = 16;

function toHex(bytes: ArrayBuffer): string {
    return [...new Uint8Array(bytes)].map((byte) => byte.toString(HEX_RADIX).padStart(2, '0')).join('');
}

export interface Signer {
    publicKeyHex: string;
    sign: (timestamp: string, body: Uint8Array) => Promise<string>;
}

interface SignedRequestInit {
    path?: string;
    timestamp?: string;
}

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export async function signedHeaders(
    signer: Signer,
    body: Uint8Array,
    timestamp = String(nowSeconds())
): Promise<Record<string, string>> {
    return {
        'x-signature-ed25519': await signer.sign(timestamp, body),
        'x-signature-timestamp': timestamp
    };
}

export async function signedRequest(signer: Signer, payload: string, init: SignedRequestInit = {}): Promise<Request> {
    const body = encoder.encode(payload);

    return new Request(`https://bot.example${init.path ?? '/interactions'}`, {
        method: 'POST',
        headers: await signedHeaders(signer, body, init.timestamp),
        body
    });
}

export async function createSigner(): Promise<Signer> {
    // justified: @types/node has no CryptoKeyPair global, and generateKey('Ed25519') returns a pair
    const pair = (await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as {
        publicKey: CryptoKey;
        privateKey: CryptoKey;
    };
    const publicKeyHex = toHex(await crypto.subtle.exportKey('raw', pair.publicKey));

    return {
        publicKeyHex,
        sign: async (timestamp, body) => {
            const timestampBytes = encoder.encode(timestamp);
            const message = new Uint8Array(timestampBytes.length + body.length);
            message.set(timestampBytes, 0);
            message.set(body, timestampBytes.length);
            return toHex(await crypto.subtle.sign('Ed25519', pair.privateKey, message));
        }
    };
}
