import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { Answers, Step } from '#interview/types';

const TRANSPORTS: Answers['transport'][] = ['http', 'gateway'];

const TRANSPORT_CHOICES = [
    { value: 'http', label: 'Http', hint: 'Discord posts interactions to your URL' },
    {
        value: 'gateway',
        label: 'Gateway',
        hint: 'keeps a connection to Discord open for messages, reactions, joins, and voice activity too'
    }
] as const;

function parseTransport(raw: string): Answers['transport'] {
    const value = raw.trim().toLowerCase();
    const match = TRANSPORTS.find((transport) => transport === value);
    if (!match) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'transport',
            `Unknown transport "${raw}". Pick http or gateway.`
        ]);
    }

    return match;
}

export const transportStep: Step<'transport'> = {
    key: 'transport',
    label: 'transport',
    flag: { name: 'transport', description: 'http or gateway', parse: parseTransport },
    ask: (_answers, prompter) =>
        prompter.select<Answers['transport']>({
            message: 'How should Discord reach your bot?',
            choices: TRANSPORT_CHOICES
        }),
    shown: (transport) => TRANSPORT_CHOICES.find((choice) => choice.value === transport)?.label ?? transport
};
