import { PassThrough } from 'node:stream';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { beforeEach, describe, expect, it } from 'vitest';

import { tokenStep } from '#interview/steps/token';

const TOKEN = `${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`;
const ENTER = '\r';
const BACKSPACE = '\x7F';
const CTRL_C = '\x03';

let keyboard = new PassThrough();

beforeEach(() => {
    keyboard = new PassThrough();
});

// the real clack prompt, reading keys from `keyboard`
function askToken(): Promise<string | null> {
    return tokenStep.ask({}, { input: keyboard, output: new PassThrough().resume() });
}

async function press(key: string): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
    keyboard.write(key);
}

async function clearLine(typed: string): Promise<void> {
    for (const _ of typed) await press(BACKSPACE);
}

async function isSettled(answer: Promise<unknown>): Promise<boolean> {
    const pending = Symbol('pending');
    const first = await Promise.race([answer, new Promise((resolve) => setImmediate(() => resolve(pending)))]);
    return first !== pending;
}

describe('token typed into a terminal', () => {
    it('keeps the prompt open after the first empty Enter', async () => {
        const answer = askToken();
        await press(ENTER);

        expect(await isSettled(answer)).toBe(false);

        await press(ENTER);
        await answer;
    });

    it('answers null on the second empty Enter', async () => {
        const answer = askToken();
        await press(ENTER);
        await press(ENTER);

        await expect(answer).resolves.toBeNull();
    });

    it('still takes a paste after the warning', async () => {
        const answer = askToken();
        await press(ENTER);
        await press(TOKEN);
        await press(ENTER);

        await expect(answer).resolves.toBe(TOKEN);
    });

    it('counts whitespace as an empty paste', async () => {
        const answer = askToken();
        await press('   ');
        await press(ENTER);

        expect(await isSettled(answer)).toBe(false);

        await press(ENTER);
        await expect(answer).resolves.toBeNull();
    });

    it('keeps the prompt open on a paste that is not the right shape', async () => {
        const answer = askToken();
        await press('not it');
        await press(ENTER);

        expect(await isSettled(answer)).toBe(false);

        await clearLine('not it');
        await press(TOKEN);
        await press(ENTER);
        await expect(answer).resolves.toBe(TOKEN);
    });

    it('warns again after a rejected paste', async () => {
        const answer = askToken();
        await press(ENTER);
        await press('not it');
        await press(ENTER);
        await clearLine('not it');
        await press(ENTER);

        expect(await isSettled(answer)).toBe(false);

        await press(ENTER);
        await expect(answer).resolves.toBeNull();
    });

    it('cancels on ctrl+c', async () => {
        const answer = askToken().catch((error: unknown) => error);
        await press(CTRL_C);

        expect(isSeedcordError(await answer, undefined, SeedcordErrorCode.CliCancelled)).toBe(true);
    });
});
