import { text } from '@clack/prompts';

import { requireAnswer } from './requireAnswer';

import type { Step } from '../types';

// an Ed25519 public key is 32 bytes
const PUBLIC_KEY_CHARS = 64;
const HEX = /^[\da-f]+$/i;

function parsePublicKey(raw: string): string {
    const value = raw.trim();

    if (value.length !== PUBLIC_KEY_CHARS || !HEX.test(value)) {
        throw new Error(`A public key is ${PUBLIC_KEY_CHARS} hex characters. Copy it from your app's main page.`);
    }

    return value.toLowerCase();
}

export const publicKeyStep: Step<'publicKey'> = {
    key: 'publicKey',
    flag: { name: 'public-key', parse: parsePublicKey },
    skip: (answers) => answers.transport === 'gateway',
    ask: async () =>
        parsePublicKey(
            requireAnswer(
                await text({
                    message: 'Paste your app public key',
                    validate: (value) => {
                        try {
                            parsePublicKey(value ?? '');
                            return undefined;
                        } catch (error) {
                            return Error.isError(error) ? error.message : 'Invalid public key.';
                        }
                    }
                })
            )
        )
};
