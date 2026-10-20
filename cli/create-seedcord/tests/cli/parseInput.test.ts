import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { parseInput, wantsHelp, wantsVerbose, wantsVersion } from '#cli/parseInput';
import { thrownBy } from '#tests/thrownBy';
import { BOT_TOKEN, TOKEN } from '#tests/token';

describe('parseInput', () => {
    it('reads every step flag into its answer', () => {
        const supplied = parseInput(['--dir', 'my-bot', '--transport', 'http', '--token', TOKEN, '--color', 'Blurple']);

        expect(supplied).toEqual({
            directory: 'my-bot',
            transport: 'http',
            token: BOT_TOKEN,
            botColor: 'Blurple'
        });
    });

    it('reads where an http bot runs from --runtime', () => {
        expect(parseInput(['my-bot', '--transport', 'http', '--runtime', 'edge']).runtime).toBe('edge');
    });

    it('takes the directory from a bare argument', () => {
        expect(parseInput(['my-bot']).directory).toBe('my-bot');
    });

    it('rejects a directory given as both an argument and a flag', () => {
        const thrown = thrownBy(() => parseInput(['my-bot', '--dir', 'other']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
    });

    it('accepts the same directory twice', () => {
        expect(parseInput(['my-bot', '--dir', 'my-bot']).directory).toBe('my-bot');
    });

    it('leaves install and git for the interview to ask', () => {
        const supplied = parseInput([]);

        expect(supplied.install).toBeUndefined();
        expect(supplied.git).toBeUndefined();
    });

    it('answers install and git yes or no through their switches', () => {
        expect(parseInput(['--install', '--no-git'])).toEqual({ install: true, git: false });
        expect(parseInput(['--no-install', '--git'])).toEqual({ install: false, git: true });
    });

    it('rejects --install passed alongside --no-install', () => {
        const thrown = thrownBy(() => parseInput(['--install', '--no-install']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateBadUsage)).toBe(true);
    });

    it('reads --no-token as a token you add to .env later', () => {
        expect(parseInput(['--no-token']).token).toBeNull();
    });

    it('rejects a token passed alongside --no-token', () => {
        const thrown = thrownBy(() => parseInput(['--token', TOKEN, '--no-token']));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateBadUsage)).toBe(true);
        expect((thrown as Error).message).toContain('--token or --no-token');
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

describe('wantsHelp', () => {
    it('reads the flag under both spellings', () => {
        expect(wantsHelp(['--help'])).toBe(true);
        expect(wantsHelp(['-h'])).toBe(true);
    });

    it('reads it alongside other flags', () => {
        expect(wantsHelp(['my-bot', '--transport', 'http', '--help'])).toBe(true);
    });

    it('answers without parsing, so a bad flag still reaches the help', () => {
        expect(wantsHelp(['--transpor', 'http', '--help'])).toBe(true);
    });

    it('is false for a run that asked for none', () => {
        expect(wantsHelp(['my-bot', '--no-git'])).toBe(false);
    });
});

describe('wantsVerbose', () => {
    it('reads the flag alongside the answers', () => {
        expect(wantsVerbose(['my-bot', '--transport', 'http', '--verbose'])).toBe(true);
        expect(parseInput(['my-bot', '--verbose'])).toEqual({ directory: 'my-bot' });
    });

    it('is false for a run that asked for none', () => {
        expect(wantsVerbose(['my-bot'])).toBe(false);
    });
});

describe('wantsVersion', () => {
    it('reads the flag under both spellings', () => {
        expect(wantsVersion(['--version'])).toBe(true);
        expect(wantsVersion(['-v'])).toBe(true);
    });

    it('answers without parsing, so a bad flag still reaches the version', () => {
        expect(wantsVersion(['--transpor', 'http', '--version'])).toBe(true);
    });

    it('is false for a run that asked for none', () => {
        expect(wantsVersion(['my-bot', '--no-git'])).toBe(false);
    });

    it('leaves a directory called version alone', () => {
        expect(wantsVersion(['version'])).toBe(false);
    });
});
