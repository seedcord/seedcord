import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { runFlow } from '@src/interview/runFlow';

import type { Answers, Step } from '@src/interview/types';

function neverAsks<Key extends keyof Answers>(key: Key, flag: string): Step<Key> {
    return {
        key,
        flag: { name: flag, description: 'a stub', parse: (raw) => raw as Answers[Key] },
        ask: () => Promise.reject(new Error(`${key} was asked with no terminal`))
    };
}

describe('runFlow with no terminal', () => {
    it('takes every answer from the flags', async () => {
        const answers = await runFlow([neverAsks('directory', 'dir')], { directory: 'my-bot' }, { interactive: false });

        expect(answers.directory).toBe('my-bot');
    });

    it('names the flag that would have to supply a missing answer', async () => {
        const thrown = await runFlow([neverAsks('transport', 'transport')], {}, { interactive: false }).catch(
            (error: unknown) => error
        );

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
        expect((thrown as Error).message).toContain('--transport');
    });

    it('leaves a skipped step alone', async () => {
        const publicKey: Step<'publicKey'> = {
            ...neverAsks('publicKey', 'public-key'),
            skip: (answers) => answers.transport === 'gateway'
        };

        const answers = await runFlow([publicKey], { transport: 'gateway' }, { interactive: false });

        expect(answers.publicKey).toBeUndefined();
    });
});
