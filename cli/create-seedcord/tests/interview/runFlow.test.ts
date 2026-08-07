import { describe, expect, it } from 'vitest';

import { runFlow } from '@src/interview/runFlow';

import type { Answers, Step } from '@src/interview/types';

function stubStep<Key extends keyof Answers>(key: Key, value: Answers[Key], asked: (keyof Answers)[]): Step<Key> {
    return {
        key,
        flag: { name: String(key), parse: (raw) => raw as Answers[Key] },
        ask: () => {
            asked.push(key);
            return Promise.resolve(value);
        }
    };
}

describe('runFlow', () => {
    it('asks every step in order and collects each answer under its key', async () => {
        const asked: (keyof Answers)[] = [];
        const answers = await runFlow(
            [stubStep('directory', 'my-bot', asked), stubStep('transport', 'gateway', asked)],
            {}
        );

        expect(asked).toEqual(['directory', 'transport']);
        expect(answers).toEqual({ directory: 'my-bot', transport: 'gateway' });
    });

    it('leaves a step unasked when its flag already supplied the answer', async () => {
        const asked: (keyof Answers)[] = [];
        const answers = await runFlow([stubStep('directory', 'prompted', asked)], { directory: 'from-flag' });

        expect(asked).toEqual([]);
        expect(answers.directory).toBe('from-flag');
    });

    it('skips a step whose skip reads the answers so far', async () => {
        const asked: (keyof Answers)[] = [];
        const capabilities: Step<'capabilities'> = {
            ...stubStep('capabilities', ['messages'], asked),
            skip: (answers) => answers.transport === 'http'
        };

        const answers = await runFlow([stubStep('transport', 'http', asked), capabilities], {});

        expect(asked).toEqual(['transport']);
        expect(answers.capabilities).toBeUndefined();
    });
});
