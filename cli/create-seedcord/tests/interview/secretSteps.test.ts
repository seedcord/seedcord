import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publicKeyStep } from '#interview/steps/publicKey';
import { tokenStep } from '#interview/steps/token';

import type { PasswordOptions, TextOptions } from '@clack/prompts';

type ValidateFn = Extract<NonNullable<TextOptions['validate']>, (value: string | undefined) => unknown>;

const KEY = 'a'.repeat(64);
const TOKEN = `${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`;

// clack never exports its cancel symbol
const prompts = vi.hoisted(() => ({
    CANCEL: Symbol('cancel'),
    password: vi.fn<(options: PasswordOptions) => Promise<unknown>>(),
    text: vi.fn<(options: TextOptions) => Promise<unknown>>()
}));

vi.mock('@clack/prompts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@clack/prompts')>()),
    isCancel: (value: unknown) => value === prompts.CANCEL,
    password: prompts.password,
    text: prompts.text
}));

beforeEach(() => {
    vi.resetAllMocks();
});

const secretSteps = [
    { step: tokenStep, input: prompts.password, pasted: TOKEN },
    { step: publicKeyStep, input: prompts.text, pasted: KEY }
];

describe.each(secretSteps)('$step.key asked on a terminal', ({ step, input, pasted }) => {
    async function validateOfPrompt(): Promise<ValidateFn> {
        input.mockResolvedValue(pasted);
        await step.ask({});

        const validate = input.mock.calls[0]?.[0].validate;
        if (typeof validate !== 'function') throw new TypeError('the prompt got no validate function');

        return validate;
    }

    it('answers the pasted value', async () => {
        input.mockResolvedValue(pasted);

        await expect(step.ask({})).resolves.toBe(pasted);
    });

    it('answers null when Enter went through on an empty paste', async () => {
        input.mockResolvedValue('');

        await expect(step.ask({})).resolves.toBeNull();
    });

    it('warns on the first empty Enter and lets the second through', async () => {
        const validate = await validateOfPrompt();

        expect(validate(undefined)).toContain('Press Enter again');
        expect(validate(undefined)).toBeUndefined();
    });

    it('counts whitespace as an empty paste', async () => {
        const validate = await validateOfPrompt();

        expect(validate('   ')).toContain('Press Enter again');
    });

    it('warns again after the user typed something in between', async () => {
        const validate = await validateOfPrompt();

        validate(undefined);
        validate('not it');

        expect(validate(undefined)).toContain('Press Enter again');
    });

    it('still rejects a paste that is not the right shape', async () => {
        const validate = await validateOfPrompt();

        expect(validate('not it')).toBeTypeOf('string');
        expect(validate(pasted)).toBeUndefined();
    });

    it('cancels from the paste', async () => {
        input.mockResolvedValue(prompts.CANCEL);

        const thrown = await step.ask({}).catch((error: unknown) => error);

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateCancelled)).toBe(true);
    });
});

describe('tokenStep', () => {
    it('takes a token shaped like the three parts Discord issues', () => {
        expect(tokenStep.flag.parse(TOKEN)).toBe(TOKEN);
    });

    it('trims a token a shell or a copy paste padded', () => {
        expect(tokenStep.flag.parse(`  ${TOKEN}  `)).toBe(TOKEN);
    });

    it('rejects three parts too short to be a token, which the bot would reject at startup', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb.ccc')).toThrow();
    });

    it('rejects a value with the wrong number of parts', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb')).toThrow();
        expect(() => tokenStep.flag.parse(`${TOKEN}.ddd`)).toThrow();
    });

    it('rejects an empty part, which is what a truncated paste looks like', () => {
        expect(() => tokenStep.flag.parse('aaa..ccc')).toThrow();
    });

    it('rejects nothing at all', () => {
        expect(() => tokenStep.flag.parse('   ')).toThrow();
    });

    it('names the flag and the Bot page, since the framework error names neither', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb.ccc')).toThrow(/--token: .*Bot page/);
    });
});

describe('publicKeyStep', () => {
    it('takes the sixty-four hex characters of an Ed25519 key', () => {
        expect(publicKeyStep.flag.parse(KEY)).toBe(KEY);
    });

    it('lowercases so two spellings of one key agree', () => {
        expect(publicKeyStep.flag.parse('A'.repeat(64))).toBe(KEY);
    });

    it('rejects a key of the wrong length', () => {
        expect(() => publicKeyStep.flag.parse('a'.repeat(63))).toThrow();
        expect(() => publicKeyStep.flag.parse('a'.repeat(65))).toThrow();
    });

    it('rejects a key with a character outside hex', () => {
        expect(() => publicKeyStep.flag.parse(`${'a'.repeat(63)}z`)).toThrow();
    });

    it('skips itself on gateway, which needs no public key', () => {
        expect(publicKeyStep.skip?.({ transport: 'gateway' })).toBe(true);
        expect(publicKeyStep.skip?.({ transport: 'http' })).toBe(false);
    });
});
