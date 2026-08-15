import { password } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';

import type { Step } from '#interview/types';

function parseToken(raw: string): string {
    try {
        return validateDiscordToken(raw);
    } catch {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'token',
            'That does not look like a bot token. Copy it from the Bot page of your app.'
        ]);
    }
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
