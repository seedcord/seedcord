import { select } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';

import type { Answers, Step } from '@interview/types';

const TRANSPORTS: Answers['transport'][] = ['http', 'gateway'];

function parseTransport(raw: string): Answers['transport'] {
    const value = raw.trim().toLowerCase();
    const match = TRANSPORTS.find((transport) => transport === value);
    if (!match) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'transport',
            `Unknown transport "${raw}". Pick http or gateway.`
        ]);
    }

    return match;
}

export const transportStep: Step<'transport'> = {
    key: 'transport',
    flag: { name: 'transport', description: 'http or gateway', parse: parseTransport },
    ask: async () =>
        requireAnswer(
            await select<Answers['transport']>({
                message: 'How should Discord reach your bot?',
                options: [
                    {
                        value: 'http',
                        label: 'Http',
                        hint: 'Discord posts interactions to your URL'
                    },
                    {
                        value: 'gateway',
                        label: 'Gateway',
                        hint: 'keeps a connection to Discord open. messages, reactions, joins, voice activity, and so on arrive on top of interactions'
                    }
                ]
            })
        )
};
