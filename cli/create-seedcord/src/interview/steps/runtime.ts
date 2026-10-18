import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { Answers, Step } from '#interview/types';
import type { Choice } from '@seedcord/cli-prompts';

const RUNTIME_CHOICES = [
    { value: 'server', label: 'Node or Bun', hint: 'a process you run on any host' },
    { value: 'edge', label: 'Cloudflare Workers', hint: "a worker on Cloudflare's network" }
] as const satisfies readonly Choice<Answers['runtime']>[];

const RUNTIMES = RUNTIME_CHOICES.map(({ value }) => value);

function parseRuntime(raw: string): Answers['runtime'] {
    const value = raw.trim().toLowerCase();
    const match = RUNTIMES.find((runtime) => runtime === value);
    if (!match) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'runtime',
            `Unknown runtime "${raw}". Pick server or edge.`
        ]);
    }

    return match;
}

export const runtimeStep: Step<'runtime'> = {
    key: 'runtime',
    label: 'runtime',
    flag: { name: 'runtime', description: 'server or edge, for an http bot', parse: parseRuntime },
    skip: (answers) => answers.transport === 'gateway',
    answerWithoutTerminal: 'server',
    ask: (_answers, prompter) =>
        prompter.select<Answers['runtime']>({
            message: 'Where should your http bot run?',
            choices: RUNTIME_CHOICES
        }),
    shown: (runtime) => RUNTIME_CHOICES.find((choice) => choice.value === runtime)?.label ?? runtime
};
