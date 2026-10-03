import { text } from '@clack/prompts';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';
import { SKIP_HINT, answerOf, skippable } from './skippable';

import type { Step } from '#interview/types';

// an Ed25519 public key is 32 bytes
const PUBLIC_KEY_CHARS = 64;
const HEX = /^[\da-f]+$/i;

function parsePublicKey(raw: string): string {
    const value = raw.trim();

    if (value.length !== PUBLIC_KEY_CHARS || !HEX.test(value)) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'public-key',
            `A public key is ${PUBLIC_KEY_CHARS} hex characters. Copy it from your app's main page.`
        ]);
    }

    return value.toLowerCase();
}

export const publicKeyStep: Step<'publicKey'> = {
    key: 'publicKey',
    flag: {
        name: 'public-key',
        description: 'your app public key, http only',
        parse: parsePublicKey,
        later: 'leave the public key empty in .env to fill in later, http only'
    },
    skip: (answers) => answers.transport === 'gateway',
    ask: async () => {
        const pasted = requireAnswer(
            await text({
                message: `Paste your app public key ${paint.mute(SKIP_HINT)}`,
                validate: skippable(parsePublicKey, 'Invalid public key.')
            })
        );

        return answerOf(pasted, parsePublicKey);
    }
};
