import { select } from '@clack/prompts';

import { requireAnswer } from './requireAnswer';

import type { Answers, Step } from '../types';

const TRANSPORTS: Answers['transport'][] = ['gateway', 'http'];

function parseTransport(raw: string): Answers['transport'] {
    const value = raw.trim().toLowerCase();
    const match = TRANSPORTS.find((transport) => transport === value);
    if (!match) throw new Error(`Unknown transport "${raw}". Pick gateway or http.`);
    return match;
}

export const transportStep: Step<'transport'> = {
    key: 'transport',
    flag: { name: 'transport', parse: parseTransport },
    ask: async () =>
        requireAnswer(
            await select<Answers['transport']>({
                message: 'How should Discord reach your bot?',
                options: [
                    {
                        value: 'gateway',
                        label: 'Gateway',
                        hint: 'keeps a connection to Discord open. messages, reactions, joins, voice activity, and so on arrive on top of interactions'
                    },
                    {
                        value: 'http',
                        label: 'Http',
                        hint: 'Discord posts interactions to your URL'
                    }
                ]
            })
        )
};
