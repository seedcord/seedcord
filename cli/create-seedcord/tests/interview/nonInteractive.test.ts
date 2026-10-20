import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { runFlow } from '#interview/runFlow';
import { BOT_TOKEN } from '#tests/token';

import type { Answers, Step } from '#interview/types';

const NO_TERMINAL = { interactive: false } as const;

function neverAsks<Key extends keyof Answers>(key: Key, flag: string): Step<Key> {
    return {
        key,
        label: String(key),
        // runFlow reads only the flag's name
        flag: { name: flag, description: 'a stub' } as Step<Key>['flag'],
        ask: () => Promise.reject(new Error(`${key} was asked with no terminal`)),
        shown: String
    };
}

describe('runFlow with no terminal', () => {
    it('takes every answer from the flags', async () => {
        const answers = await runFlow([neverAsks('directory', 'dir')], { directory: 'my-bot' }, NO_TERMINAL);

        expect(answers.directory).toBe('my-bot');
    });

    it('names the flag that would have to supply a missing answer', async () => {
        const thrown = await runFlow([neverAsks('transport', 'transport')], {}, NO_TERMINAL).catch(
            (error: unknown) => error
        );

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
        expect((thrown as Error).message).toContain('--transport');
    });

    it('takes a null from a --no- flag as an answer', async () => {
        const answers = await runFlow([neverAsks('token', 'token')], { token: null }, NO_TERMINAL);

        expect(answers.token).toBeNull();
    });

    it('offers the --no- flag, with what it does, when a step that can wait has no answer', async () => {
        const token: Step<'token'> = {
            ...neverAsks('token', 'token'),
            flag: { name: 'token', description: 'a stub', parse: () => BOT_TOKEN, noFlag: 'leave it for later' }
        };

        const thrown = await runFlow([token], {}, NO_TERMINAL).catch((error: unknown) => error);

        expect((thrown as Error).message).toContain('--no-token to leave it for later');
    });

    it('uses the answer a step gives for no terminal when no flag supplied one', async () => {
        const install: Step<'install'> = { ...neverAsks('install', 'install'), answerWithoutTerminal: true };

        const answers = await runFlow([install], {}, NO_TERMINAL);

        expect(answers.install).toBe(true);
    });

    it('leaves a skipped step alone', async () => {
        const capabilities: Step<'capabilities'> = {
            ...neverAsks('capabilities', 'capabilities'),
            skip: (answers) => answers.transport === 'http'
        };

        const answers = await runFlow([capabilities], { transport: 'http' }, NO_TERMINAL);

        expect(answers.capabilities).toBeUndefined();
    });
});
