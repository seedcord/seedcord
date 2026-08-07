import { password } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';

import type { Step } from '@interview/types';

const TOKEN_PARTS = 3;

// startup runs the real check through validateDiscordToken
function parseToken(raw: string): string {
    const value = raw.trim();
    const parts = value.split('.');

    if (parts.length !== TOKEN_PARTS || parts.includes('')) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'token',
            'That does not look like a bot token. Copy it from the Bot page of your app.'
        ]);
    }

    return value;
}

export const tokenStep: Step<'token'> = {
    key: 'token',
    flag: { name: 'token', description: 'your bot token', parse: parseToken },
    ask: async () =>
        parseToken(
            requireAnswer(
                await password({
                    message: 'Paste your bot token',
                    validate: (value) => {
                        try {
                            parseToken(value ?? '');
                            return undefined;
                        } catch (error) {
                            return Error.isError(error) ? error.message : 'Invalid token.';
                        }
                    }
                })
            )
        )
};
