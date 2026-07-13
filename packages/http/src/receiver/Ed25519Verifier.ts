import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

const PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;
const HEX_RADIX = 16;
const HEX_PATTERN = /^[0-9a-f]+$/i;

function hexToBytes(hex: string, byteLength: number): Uint8Array<ArrayBuffer> | null {
    if (hex.length !== byteLength * 2 || !HEX_PATTERN.test(hex)) return null;

    const bytes = new Uint8Array(byteLength);
    for (let index = 0; index < byteLength; index++) {
        bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), HEX_RADIX);
    }
    return bytes;
}

const encoder = new TextEncoder();

export class Ed25519Verifier {
    private readonly key: Promise<CryptoKey>;

    constructor(publicKeyHex: string) {
        const publicKey = hexToBytes(publicKeyHex, PUBLIC_KEY_BYTES);
        if (!publicKey) throw new SeedcordError(SeedcordErrorCode.ConfigIncorrectPublicKey);

        this.key = crypto.subtle.importKey('raw', publicKey, 'Ed25519', false, ['verify']);
    }

    async verify(signatureHex: string, timestamp: string, body: Uint8Array): Promise<boolean> {
        const signature = hexToBytes(signatureHex, SIGNATURE_BYTES);
        if (!signature) return false;

        const timestampBytes = encoder.encode(timestamp);
        const message = new Uint8Array(timestampBytes.length + body.length);
        message.set(timestampBytes, 0);
        message.set(body, timestampBytes.length);

        return crypto.subtle.verify('Ed25519', await this.key, signature, message);
    }
}
