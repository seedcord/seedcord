import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError, validateDiscordToken } from '@seedcord/errors/internal';

import { validatorFor } from './validatorFor';

import type { Step } from '#interview/types';
import type { BotToken } from '@seedcord/errors/internal';

function parseToken(raw: string): BotToken {
    try {
        return validateDiscordToken(raw);
    } catch {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'token',
            'That does not look like a bot token. Copy it from the Bot page of your app.'
        ]);
    }
}

export const tokenStep: Step<'token'> = {
    key: 'token',
    label: 'token',
    flag: {
        name: 'token',
        description: 'your bot token',
        parse: parseToken,
        noFlag: 'leave the bot token empty in .env to fill in later'
    },
    ask: async (_answers, prompter) => {
        const pasted = await prompter.password({
            message: `Paste your bot token ${paint.mute('or press Enter twice to add it to .env later')}`,
            validate: validatorFor(parseToken),
            emptyWarning: 'Nothing pasted. Press Enter again to leave it empty in .env for now.'
        });

        return pasted === '' ? null : parseToken(pasted);
    },
    shown: (token) => (token === null ? paint.mute('later, in .env') : '••••••••')
};
