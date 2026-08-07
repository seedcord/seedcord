import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { parseInput } from '@src/cli/parseInput';

function thrownBy(run: () => unknown): unknown {
    try {
        run();
    } catch (error) {
        return error;
    }

    return undefined;
}

describe('parseInput', () => {
    it('reads every step flag into its answer', () => {
        const { supplied } = parseInput([
            '--dir',
            'my-bot',
            '--transport',
            'http',
            '--token',
            'aaa.bbb.ccc',
            '--public-key',
            'a'.repeat(64),
            '--color',
            'Blurple'
        ]);

        expect(supplied).toEqual({
            directory: 'my-bot',
            transport: 'http',
            token: 'aaa.bbb.ccc',
            publicKey: 'a'.repeat(64),
            botColor: 'Blurple'
        });
    });

    it('takes the directory from a bare argument', () => {
        expect(parseInput(['my-bot']).supplied.directory).toBe('my-bot');
    });

    it('rejects a directory given as both an argument and a flag', () => {
        const thrown = thrownBy(() => parseInput(['my-bot', '--dir', 'other']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
    });

    it('accepts the same directory twice', () => {
        expect(parseInput(['my-bot', '--dir', 'my-bot']).supplied.directory).toBe('my-bot');
    });

    it('installs and runs git unless told otherwise', () => {
        const { install, git } = parseInput([]);

        expect(install).toBe(true);
        expect(git).toBe(true);
    });

    it('turns each step off through its own flag', () => {
        expect(parseInput(['--no-install']).install).toBe(false);
        expect(parseInput(['--no-git']).git).toBe(false);
    });

    it('reads the help flag under both spellings', () => {
        expect(parseInput(['--help']).help).toBe(true);
        expect(parseInput(['-h']).help).toBe(true);
    });

    it('names an unknown flag and points at the help', () => {
        const thrown = thrownBy(() => parseInput(['--transpor', 'http']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateBadUsage)).toBe(true);
        expect((thrown as Error).message).toContain('--help');
    });

    it('rejects more than one bare argument', () => {
        const thrown = thrownBy(() => parseInput(['my-bot', 'other-bot']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateBadUsage)).toBe(true);
    });

    it('still rejects a flag value the step refuses', () => {
        const thrown = thrownBy(() => parseInput(['--transport', 'websocket']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
    });
});
