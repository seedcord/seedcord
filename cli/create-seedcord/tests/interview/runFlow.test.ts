import { Prompter } from '@seedcord/cli-prompts';
import { describe, expect, it } from 'vitest';

import { runFlow } from '#interview/runFlow';
import { BOT_TOKEN } from '#tests/token';

import type { FlowMode } from '#interview/runFlow';
import type { Answers, Step } from '#interview/types';

function stubStep<Key extends keyof Answers>(key: Key, value: Answers[Key], asked: (keyof Answers)[]): Step<Key> {
    return {
        key,
        label: String(key),
        // runFlow reads only the flag's name
        flag: { name: String(key), description: 'a stub' } as Step<Key>['flag'],
        ask: () => {
            asked.push(key);
            return Promise.resolve(value);
        },
        shown: (answer) => `shown ${JSON.stringify(answer)}`
    };
}

// the stub steps never prompt
function interactive(rows: string[] = []): FlowMode {
    return { interactive: true, prompter: new Prompter(), onAnswer: (label, shown) => rows.push(`${label}: ${shown}`) };
}

describe('runFlow', () => {
    it('asks every step in order and collects each answer under its key', async () => {
        const asked: (keyof Answers)[] = [];
        const answers = await runFlow(
            [stubStep('directory', 'my-bot', asked), stubStep('transport', 'gateway', asked)],
            {},
            interactive()
        );

        expect(asked).toEqual(['directory', 'transport']);
        expect(answers).toEqual({ directory: 'my-bot', transport: 'gateway' });
    });

    it('hands each asked answer to onAnswer, and leaves out what a flag supplied', async () => {
        const rows: string[] = [];

        await runFlow(
            [stubStep('directory', 'my-bot', []), stubStep('transport', 'gateway', [])],
            { directory: 'from-flag' },
            interactive(rows)
        );

        expect(rows).toEqual(['transport: shown "gateway"']);
    });

    it('leaves a step unasked when its flag already supplied the answer', async () => {
        const asked: (keyof Answers)[] = [];
        const answers = await runFlow(
            [stubStep('directory', 'prompted', asked)],
            { directory: 'from-flag' },
            interactive()
        );

        expect(asked).toEqual([]);
        expect(answers.directory).toBe('from-flag');
    });

    it('skips a step whose skip reads the answers so far', async () => {
        const asked: (keyof Answers)[] = [];
        const capabilities: Step<'capabilities'> = {
            ...stubStep('capabilities', ['messages'], asked),
            skip: (answers) => answers.transport === 'http'
        };

        const answers = await runFlow([stubStep('transport', 'http', asked), capabilities], {}, interactive());

        expect(asked).toEqual(['transport']);
        expect(answers.capabilities).toBeUndefined();
    });

    it('leaves a step unasked when its --no- flag answered null', async () => {
        const asked: (keyof Answers)[] = [];
        const answers = await runFlow([stubStep('token', BOT_TOKEN, asked)], { token: null }, interactive());

        expect(asked).toEqual([]);
        expect(answers.token).toBeNull();
    });
});
