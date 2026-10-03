import { PassThrough } from 'node:stream';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publicKeyStep } from '#interview/steps/publicKey';
import { tokenStep } from '#interview/steps/token';

const KEY = 'a'.repeat(64);
const TOKEN = `${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`;
const ENTER = '\r';

let keyboard = new PassThrough();

// the real prompts run, reading keys from keyboard once a prompt opens
vi.mock('@clack/prompts', async (importOriginal) => {
    const clack = await importOriginal<typeof import('@clack/prompts')>();
    const output = (): PassThrough => new PassThrough().resume();

    return {
        ...clack,
        password: (options: Parameters<typeof clack.password>[0]) =>
            clack.password({ ...options, input: keyboard, output: output() }),
        text: (options: Parameters<typeof clack.text>[0]) =>
            clack.text({ ...options, input: keyboard, output: output() })
    };
});

beforeEach(() => {
    keyboard = new PassThrough();
});

async function press(key: string): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
    keyboard.write(key);
}

async function isSettled(answer: Promise<unknown>): Promise<boolean> {
    const pending = Symbol('pending');
    const first = await Promise.race([answer, new Promise((resolve) => setImmediate(() => resolve(pending)))]);
    return first !== pending;
}

const secretSteps = [
    { step: tokenStep, pasted: TOKEN },
    { step: publicKeyStep, pasted: KEY }
];

describe.each(secretSteps)('$step.key typed into a terminal', ({ step, pasted }) => {
    it('keeps the prompt open after the first empty Enter', async () => {
        const answer = step.ask({});
        await press(ENTER);

        expect(await isSettled(answer)).toBe(false);

        await press(ENTER);
        await answer;
    });

    it('answers null on the second empty Enter', async () => {
        const answer = step.ask({});
        await press(ENTER);
        await press(ENTER);

        await expect(answer).resolves.toBeNull();
    });

    it('still takes a paste after the warning', async () => {
        const answer = step.ask({});
        await press(ENTER);
        await press(pasted);
        await press(ENTER);

        await expect(answer).resolves.toBe(pasted);
    });
});
