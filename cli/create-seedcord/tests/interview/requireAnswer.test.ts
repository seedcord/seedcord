import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { requireAnswer } from '@src/interview/steps/requireAnswer';

// clack never exports its cancel symbol, and isCancel compares it by identity
const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol('cancel') }));

vi.mock('@clack/prompts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@clack/prompts')>()),
    isCancel: (value: unknown) => value === CANCEL
}));

describe('requireAnswer', () => {
    it('returns an answer untouched', () => {
        expect(requireAnswer('my-bot')).toBe('my-bot');
    });

    it('throws the cancel code when the user pressed Ctrl-C', () => {
        const thrown = (() => {
            try {
                requireAnswer<string>(CANCEL);
            } catch (error) {
                return error;
            }

            return undefined;
        })();

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateCancelled)).toBe(true);
    });
});
