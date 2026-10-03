import { password } from '@clack/prompts';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';
import { SKIP_HINT, answerOf, skippable } from './skippable';

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
    flag: {
        name: 'token',
        description: 'your bot token',
        parse: parseToken,
        later: 'leave the bot token empty in .env to fill in later'
    },
    ask: async () => {
        const pasted = requireAnswer(
            await password({
                message: `Paste your bot token ${paint.mute(SKIP_HINT)}`,
                validate: skippable(parseToken, 'Invalid token.')
            })
        );

        return answerOf(pasted, parseToken);
    }
};
