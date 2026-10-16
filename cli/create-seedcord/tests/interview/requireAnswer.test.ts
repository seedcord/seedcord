import { PassThrough } from 'node:stream';

import { text } from '@clack/prompts';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { requireAnswer } from '#interview/steps/requireAnswer';

const CTRL_C = '\x03';

// clack never exports its cancel symbol. a prompt cancelled with ctrl+c returns it
async function cancelledAnswer(): Promise<unknown> {
    const keyboard = new PassThrough();
    const answer = text({ message: 'name', input: keyboard, output: new PassThrough().resume() });
    await new Promise((resolve) => setImmediate(resolve));
    keyboard.write(CTRL_C);
    return answer;
}

describe('requireAnswer', () => {
    it('returns an answer untouched', () => {
        expect(requireAnswer('my-bot')).toBe('my-bot');
    });

    it('throws the cancel code when the user pressed Ctrl-C', async () => {
        const cancelled = await cancelledAnswer();
        const thrown = (() => {
            try {
                requireAnswer(cancelled);
            } catch (error) {
                return error;
            }

            return undefined;
        })();

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CliCancelled)).toBe(true);
    });
});
