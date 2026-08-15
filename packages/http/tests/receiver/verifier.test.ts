import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { Ed25519Verifier } from '#src/receiver/Ed25519Verifier';

import { createSigner } from '../helpers/ed25519';

const encoder = new TextEncoder();

const body = encoder.encode('{"type":1}');
const timestamp = '1752350000';

describe('Ed25519Verifier', () => {
    it('accepts a request signed with the matching private key', async () => {
        const signer = await createSigner();
        const verifier = new Ed25519Verifier(signer.publicKeyHex);

        const signature = await signer.sign(timestamp, body);

        await expect(verifier.verify(signature, timestamp, body)).resolves.toBe(true);
    });

    it('rejects a signature over a different body', async () => {
        const signer = await createSigner();
        const verifier = new Ed25519Verifier(signer.publicKeyHex);

        const signature = await signer.sign(timestamp, encoder.encode('{"type":2}'));

        await expect(verifier.verify(signature, timestamp, body)).resolves.toBe(false);
    });

    it('rejects a signature over a different timestamp', async () => {
        const signer = await createSigner();
        const verifier = new Ed25519Verifier(signer.publicKeyHex);

        const signature = await signer.sign('1752350001', body);

        await expect(verifier.verify(signature, timestamp, body)).resolves.toBe(false);
    });

    it('rejects a signature from another key pair', async () => {
        const signer = await createSigner();
        const impostor = await createSigner();
        const verifier = new Ed25519Verifier(signer.publicKeyHex);

        const signature = await impostor.sign(timestamp, body);

        await expect(verifier.verify(signature, timestamp, body)).resolves.toBe(false);
    });

    it.each([
        ['non-hex characters', 'zz'.repeat(64)],
        ['wrong length', 'ab'.repeat(63)],
        ['empty', '']
    ])('rejects a malformed signature (%s)', async (_label, signature) => {
        const signer = await createSigner();
        const verifier = new Ed25519Verifier(signer.publicKeyHex);

        await expect(verifier.verify(signature, timestamp, body)).resolves.toBe(false);
    });

    it('reuses the imported key across calls', async () => {
        const signer = await createSigner();
        const verifier = new Ed25519Verifier(signer.publicKeyHex);

        await expect(verifier.verify(await signer.sign('1', body), '1', body)).resolves.toBe(true);
        await expect(verifier.verify(await signer.sign('2', body), '2', body)).resolves.toBe(true);
    });

    it.each([
        ['non-hex characters', 'zz'.repeat(32)],
        ['wrong length', 'ab'.repeat(31)],
        ['empty', '']
    ])('throws ConfigIncorrectPublicKey on a malformed public key (%s)', (_label, publicKeyHex) => {
        try {
            const verifier = new Ed25519Verifier(publicKeyHex);
            expect.unreachable(`construction should throw, got ${typeof verifier}`);
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ConfigIncorrectPublicKey)).toBe(true);
        }
    });
});
