import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { runningAgent } from '#cli/packageManager';

import type { Answers, Step } from '#interview/types';

const RUNTIME_CHOICES = [
    { value: 'server', label: 'Your server', hint: 'a node or bun process on any host' },
    { value: 'edge', label: 'Cloudflare Workers', hint: "a worker on Cloudflare's network" }
] as const satisfies readonly { value: Answers['runtime']; label: string; hint: string }[];

const RUNTIMES = RUNTIME_CHOICES.map(({ value }) => value);

function refuseEdgeOnBun(runtime: Answers['runtime']): Answers['runtime'] {
    if (runtime === 'edge' && runningAgent() === 'bun') {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'runtime',
            "An edge bot needs node, because Cloudflare's config loader refuses Bun. Run pnpm create seedcord or npm create seedcord instead."
        ]);
    }

    return runtime;
}

function parseRuntime(raw: string): Answers['runtime'] {
    const value = raw.trim().toLowerCase();
    const match = RUNTIMES.find((runtime) => runtime === value);
    if (!match) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'runtime',
            `Unknown runtime "${raw}". Pick server or edge.`
        ]);
    }

    return refuseEdgeOnBun(match);
}

export const runtimeStep: Step<'runtime'> = {
    key: 'runtime',
    label: 'runtime',
    flag: { name: 'runtime', description: 'server or edge, for an http bot', parse: parseRuntime },
    skip: (answers) => answers.transport === 'gateway',
    answerWithoutTerminal: 'server',
    ask: async (_answers, prompter) =>
        refuseEdgeOnBun(
            await prompter.select<Answers['runtime']>({
                message: 'Where should your http bot run?',
                choices: RUNTIME_CHOICES
            })
        ),
    shown: (runtime) => RUNTIME_CHOICES.find((choice) => choice.value === runtime)?.label ?? runtime
};
